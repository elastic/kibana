/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import http from 'http';
import https from 'https';
import execa from 'execa';
import chalk from 'chalk';

interface EisVaultData {
  apiKey: string;
  inferenceUrl: string;
}

interface ElasticsearchConnection {
  baseUrl: string;
  auth: string;
  ssl: boolean;
}

function httpRequest(
  url: string,
  options: http.RequestOptions | https.RequestOptions,
  body?: string,
  ssl: boolean = true
): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    const requestFn = ssl ? https.request : http.request;
    const req = requestFn(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({ statusCode: res.statusCode || 0, data });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

async function getES(log: ToolingLog): Promise<ElasticsearchConnection> {
  log.debug('Determining Elasticsearch connection');

  // Check environment variables first
  const envUsername = process.env.ES_USERNAME || process.env.ELASTICSEARCH_USERNAME;
  const envPassword = process.env.ES_PASSWORD || process.env.ELASTICSEARCH_PASSWORD;

  const credentialsToTry =
    envUsername && envPassword
      ? [{ username: envUsername, password: envPassword }]
      : [
          { username: 'elastic', password: 'changeme' },
          { username: 'elastic_serverless', password: 'changeme' },
        ];

  if (envUsername && envPassword) {
    log.debug('Using credentials from environment variables');
  }

  for (const credentials of credentialsToTry) {
    log.debug(`Trying credentials: ${credentials.username}`);

    // Try HTTPS first
    let tryHttp = false;
    for (const useSsl of [true, false]) {
      // Skip HTTP unless we detected an SSL handshake failure
      if (!useSsl && !tryHttp) {
        continue;
      }

      const protocol = useSsl ? 'https' : 'http';
      const baseUrl = `${protocol}://localhost:9200`;
      const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString(
        'base64'
      );

      try {
        const { statusCode } = await httpRequest(
          baseUrl,
          {
            method: 'GET',
            headers: {
              Authorization: `Basic ${auth}`,
            },
            rejectUnauthorized: false,
          },
          undefined,
          useSsl
        );

        if (statusCode === 200) {
          log.debug(`${credentials.username} is authorized`);
          return { baseUrl, auth, ssl: useSsl };
        }
      } catch (error) {
        // Check for SSL handshake failures on HTTPS attempt
        if (useSsl) {
          const handshakeFailurePatterns = [
            'EPROTO',
            'ERR_SSL_WRONG_VERSION_NUMBER',
            'packet length too long',
          ];
          const handshakeFailure = handshakeFailurePatterns.some((p) => error.message.includes(p));

          if (handshakeFailure) {
            log.info('HTTPS handshake failed due to protocol mismatch — falling back to HTTP');
            tryHttp = true;
            // Continue to next iteration (HTTP)
          }
        }
        // Continue to next SSL option or credentials
      }
    }
  }

  throw new Error(
    'Could not authenticate to Elasticsearch. Please set ES_USERNAME and ES_PASSWORD environment variables or ensure Elasticsearch is running with default credentials (elastic:changeme or elastic_serverless:changeme)'
  );
}

async function getEisVaultData(log: ToolingLog): Promise<EisVaultData> {
  log.debug('Fetching EIS data from vault');

  const secretPath = 'secret/kibana-issues/dev/inference/kibana-eis-ccm';
  const vaultAddress = process.env.VAULT_ADDR || 'https://secrets.elastic.co:8200';

  try {
    const { stdout: apiKey } = await execa.command(`vault read -field key ${secretPath}`, {
      env: { VAULT_ADDR: vaultAddress },
    });

    const { stdout: inferenceUrl } = await execa.command(
      `vault read -field inference_url ${secretPath}`,
      {
        env: { VAULT_ADDR: vaultAddress },
      }
    );

    return {
      apiKey: apiKey.trim(),
      inferenceUrl: inferenceUrl.trim(),
    };
  } catch (error) {
    throw new Error(
      'Failed to read EIS data from vault. Please ensure you are logged in to vault (vault login --method oidc) and connected to VPN if needed. See https://docs.elastic.dev/vault',
      { cause: error }
    );
  }
}

async function makeEsRequest(
  endpoint: string,
  body: object,
  es: ElasticsearchConnection
): Promise<{ statusCode: number; data: string }> {
  const bodyString = JSON.stringify(body);

  return httpRequest(
    `${es.baseUrl}/${endpoint}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${es.auth}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyString),
      },
      rejectUnauthorized: false,
    },
    bodyString,
    es.ssl
  );
}

async function setInferenceUrl(
  inferenceUrl: string,
  es: ElasticsearchConnection,
  log: ToolingLog
): Promise<void> {
  log.debug(`Setting inference URL to: ${inferenceUrl}`);

  const { statusCode } = await makeEsRequest(
    '_cluster/settings',
    {
      persistent: {
        'xpack.inference.elastic.url': inferenceUrl,
      },
    },
    es
  );

  if (statusCode >= 200 && statusCode < 300) {
    log.debug('Successfully set inference URL');
    return;
  }

  throw new Error(`Failed to set inference URL: HTTP ${statusCode}`);
}

async function setCcmApiKey(
  apiKey: string,
  es: ElasticsearchConnection,
  log: ToolingLog
): Promise<void> {
  log.debug('Setting CCM API key in Elasticsearch');

  const maxRetries = 3;
  const retryDelayMs = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { statusCode } = await makeEsRequest('_inference/_ccm', { api_key: apiKey }, es);

      if (statusCode >= 200 && statusCode < 300) {
        log.debug('Successfully set CCM API key');
        return;
      }

      throw new Error(`HTTP ${statusCode}`);
    } catch (error) {
      if (attempt < maxRetries) {
        log.debug(`Attempt ${attempt} failed, retrying in ${retryDelayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      } else {
        throw new Error(`Failed to set CCM API key after ${maxRetries} attempts`, {
          cause: error,
        });
      }
    }
  }
}

export async function ensureEis({ log }: { log: ToolingLog }) {
  log.info('Setting up Cloud Connected Mode for EIS');

  // Get Elasticsearch connection info
  const es = await getES(log);

  // Get EIS data from vault
  const { apiKey, inferenceUrl } = await getEisVaultData(log);

  // Set inference URL in Elasticsearch cluster settings
  await setInferenceUrl(inferenceUrl, es, log);

  // Set CCM API key in Elasticsearch
  await setCcmApiKey(apiKey, es, log);

  log.write('');
  log.write(`${chalk.green('✔')} Successfully configured Cloud Connected Mode for EIS`);
  log.write(`${chalk.green('✔')} Inference URL: ${inferenceUrl}`);
  log.write('');
}

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

interface ElasticsearchCredentials {
  username: string;
  password: string;
}

interface ElasticsearchConnection {
  baseUrl: string;
  credentials: ElasticsearchCredentials;
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

async function testCredentials(
  baseUrl: string,
  credentials: ElasticsearchCredentials,
  ssl: boolean,
  log: ToolingLog
): Promise<boolean> {
  try {
    const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
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
      ssl
    );

    return statusCode === 200;
  } catch (error) {
    if (error.code === 'EPROTO') {
      log.debug('Protocol mismatch detected — attempting to connect with HTTP');
      throw new Error('Protocol mismatch error');
    }

    throw new Error('Failed to connect to Elasticsearch', { cause: error });
  }
}

async function getES(log: ToolingLog) {
  log.debug('Determining Elasticsearch connection');

  const localhost = 'localhost:9200';
  const protocols = ['https', 'http'];

  const envUsername = process.env.ES_USERNAME || process.env.ELASTICSEARCH_USERNAME;
  const envPassword = process.env.ES_PASSWORD || process.env.ELASTICSEARCH_PASSWORD;

  const credentialsToTry: {
    username: string;
    password: string;
    type: string;
  }[] = [];

  if (envUsername && envPassword) {
    credentialsToTry.push({
      username: envUsername,
      password: envPassword,
      type: 'environment variable',
    });
  }

  credentialsToTry.push(
    { username: 'elastic', password: 'changeme', type: 'default' },
    { username: 'elastic_serverless', password: 'changeme', type: 'default' }
  );

  for (const protocol of protocols) {
    const baseUrl = `${protocol}://${localhost}`;

    for (const credentials of credentialsToTry) {
      const isSsl = protocol === 'https';
      try {
        log.debug(`Trying ${credentials.type} credentials: ${credentials.username}`);

        const isValid = await testCredentials(baseUrl, credentials, isSsl, log);

        if (isValid) {
          log.debug(
            `Authorized with ${credentials.type} credentials ${credentials.username} (${protocol})`
          );

          return {
            baseUrl,
            credentials,
            ssl: isSsl,
          };
        }
      } catch (error) {
        if (error.message === 'Protocol mismatch error') {
          break; // stop trying creds, move to next protocol
        }
      }
    }
  }

  throw new Error(
    'Could not authenticate to Elasticsearch. Please set ES_USERNAME and ES_PASSWORD environment variables or ensure Elasticsearch is running with default credentials (elastic:changeme or elastic_serverless:changeme)'
  );
}

async function getEisApiKey(log: ToolingLog): Promise<string> {
  log.debug('Fetching EIS API key from vault');

  const secretPath = 'secret/kibana-issues/dev/inference/kibana-eis-ccm';
  const vaultAddress = process.env.VAULT_ADDR || 'https://secrets.elastic.co:8200';

  try {
    const { stdout: apiKey } = await execa.command(`vault read -field key ${secretPath}`, {
      env: { VAULT_ADDR: vaultAddress },
    });

    return apiKey.trim();
  } catch (error) {
    throw new Error(
      'Failed to read EIS API key from vault. Please ensure you are logged in to vault (vault login --method oidc) and connected to VPN if needed. See https://docs.elastic.dev/vault',
      { cause: error }
    );
  }
}

async function setCcmApiKey(
  apiKey: string,
  es: ElasticsearchConnection,
  log: ToolingLog
): Promise<void> {
  log.debug('Setting CCM API key in Elasticsearch');

  const maxRetries = 3;
  const retryDelayMs = 2000;
  const esUrl = `${es.baseUrl}/_inference/_ccm`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const auth = Buffer.from(`${es.credentials.username}:${es.credentials.password}`).toString(
        'base64'
      );
      const body = JSON.stringify({ api_key: apiKey });

      const { statusCode } = await httpRequest(
        esUrl,
        {
          method: 'PUT',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          rejectUnauthorized: false,
        },
        body,
        es.ssl
      );

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

  // Get EIS API key from vault
  const apiKey = await getEisApiKey(log);

  // Set CCM API key in Elasticsearch
  await setCcmApiKey(apiKey, es, log);

  log.write('');
  log.write(`${chalk.green('✔')} EIS API key successfully set in Cloud Connected Mode`);
  log.write('');
  const eisUrlFlag = chalk.cyan(
    '-E xpack.inference.elastic.url=https://inference.eu-west-1.aws.svc.qa.elastic.cloud'
  );
  log.write(`${chalk.yellow('⚠')} Remember: Elasticsearch must be started with ${eisUrlFlag}`);
  log.write('');
}

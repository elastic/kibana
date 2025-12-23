/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import https from 'https';
import execa from 'execa';
import chalk from 'chalk';

interface ElasticsearchCredentials {
  username: string;
  password: string;
}

function httpsRequest(
  url: string,
  options: https.RequestOptions,
  body?: string
): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
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

async function getElasticsearchCredentials(log: ToolingLog): Promise<ElasticsearchCredentials> {
  log.debug('Determining Elasticsearch credentials');

  // Check environment variables first
  const envUsername = process.env.ES_USERNAME || process.env.ELASTICSEARCH_USERNAME;
  const envPassword = process.env.ES_PASSWORD || process.env.ELASTICSEARCH_PASSWORD;

  if (envUsername && envPassword) {
    log.debug('Using credentials from environment variables');
    return { username: envUsername, password: envPassword };
  }

  // Try default credentials
  const credentialsToTry = [
    { username: 'elastic', password: 'changeme' },
    { username: 'elastic_serverless', password: 'changeme' },
  ];

  for (const credentials of credentialsToTry) {
    log.debug(`Trying credentials: ${credentials.username}`);
    try {
      const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString(
        'base64'
      );
      const { statusCode } = await httpsRequest('https://localhost:9200', {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
        },
        rejectUnauthorized: false,
      });

      if (statusCode === 200) {
        log.debug(`Credentials ${credentials.username} authorized`);
        return credentials;
      }
    } catch (error) {
      // Continue to next credentials
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
      'Failed to read EIS API key from vault. Please ensure you are logged in to vault (vault login -method=okta) and connected to VPN if needed. See https://docs.elastic.dev/vault',
      { cause: error }
    );
  }
}

async function setCcmApiKey(
  apiKey: string,
  credentials: ElasticsearchCredentials,
  log: ToolingLog
): Promise<void> {
  log.debug('Setting CCM API key in Elasticsearch');

  const maxRetries = 3;
  const retryDelayMs = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString(
        'base64'
      );
      const body = JSON.stringify({ api_key: apiKey });

      const { statusCode } = await httpsRequest(
        'https://localhost:9200/_inference/_ccm',
        {
          method: 'PUT',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          rejectUnauthorized: false,
        },
        body
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
        throw new Error('Failed to set CCM API key after 3 attempts', { cause: error });
      }
    }
  }
}

export async function ensureEis({ log }: { log: ToolingLog }) {
  log.info('Setting up Cloud Connected Mode for EIS');

  // Get Elasticsearch credentials
  const credentials = await getElasticsearchCredentials(log);

  // Get EIS API key from vault
  const apiKey = await getEisApiKey(log);

  // Set CCM API key in Elasticsearch
  await setCcmApiKey(apiKey, credentials, log);

  log.write('');
  log.write(`${chalk.green('✔')} EIS API key successfully set in Cloud Connected Mode`);
  log.write('');
  const eisUrlFlag = chalk.cyan(
    '-E xpack.inference.elastic.url=https://inference.eu-west-1.aws.svc.qa.elastic.cloud'
  );
  log.write(`${chalk.yellow('⚠')} Remember: Elasticsearch must be started with ${eisUrlFlag}`);
  log.write('');
}

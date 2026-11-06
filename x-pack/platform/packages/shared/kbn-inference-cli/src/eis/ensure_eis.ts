/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import {
  EIS_ES_ARG,
  createBasicAuth,
  eisHttpRequest,
  resolveCcmApiKey,
  setCcmApiKey,
  type EisElasticsearchConnection,
} from '@kbn/es';
import chalk from 'chalk';

interface ElasticsearchCredentials {
  username: string;
  password: string;
}

const EIS_URL_FLAG = `-E ${EIS_ES_ARG}`;

const testCredentials = async (
  baseUrl: string,
  credentials: ElasticsearchCredentials,
  ssl: boolean,
  log: ToolingLog
): Promise<boolean> => {
  try {
    const { statusCode } = await eisHttpRequest(
      baseUrl,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${createBasicAuth(credentials.username, credentials.password)}`,
        },
        rejectUnauthorized: false,
      },
      undefined,
      ssl
    );

    return statusCode === 200;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EPROTO') {
      log.debug('Protocol mismatch detected — attempting to connect with HTTP');
      throw new Error('Protocol mismatch error');
    }

    throw new Error('Failed to connect to Elasticsearch', { cause: error as Error });
  }
};

const getES = async (log: ToolingLog): Promise<EisElasticsearchConnection> => {
  const rawHost = process.env.ES_HOST || 'localhost';
  const port = process.env.ES_PORT || '9200';

  const protocolMatch = rawHost.match(/^(https?):\/\/(.+)$/);
  const protocols = protocolMatch ? [protocolMatch[1]] : ['https', 'http'];
  const hostname = protocolMatch ? protocolMatch[2] : rawHost;
  const esAddress = `${hostname}:${port}`;

  const envUsername = process.env.ES_USERNAME || process.env.ELASTICSEARCH_USERNAME;
  const envPassword = process.env.ES_PASSWORD || process.env.ELASTICSEARCH_PASSWORD;

  const credentialsToTry: Array<{ username: string; password: string; type: string }> = [];

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
    const baseUrl = `${protocol}://${esAddress}`;

    for (const credentials of credentialsToTry) {
      const isSsl = protocol === 'https';
      try {
        log.debug(`Trying ${credentials.type} credentials: ${credentials.username}`);

        const isValid = await testCredentials(baseUrl, credentials, isSsl, log);

        if (isValid) {
          log.info(
            `Connected to Elasticsearch at ${chalk.cyan(baseUrl)} (${
              credentials.type
            } credentials: ${credentials.username})`
          );

          return { baseUrl, credentials, ssl: isSsl };
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Protocol mismatch error') {
          break; // stop trying creds, move to next protocol
        }
      }
    }
  }

  throw new Error(
    [
      `Could not connect to Elasticsearch at ${esAddress}.`,
      '',
      `Make sure Elasticsearch is running with the EIS URL flag:`,
      '',
      `  ${chalk.cyan(EIS_URL_FLAG)}`,
      '',
      'If using custom credentials, set ES_USERNAME and ES_PASSWORD environment variables.',
    ].join('\n')
  );
};

const getEisEndpoint = async (
  es: EisElasticsearchConnection,
  log: ToolingLog
): Promise<string | undefined> => {
  try {
    const { statusCode, data } = await eisHttpRequest(
      `${es.baseUrl}/_cluster/settings?include_defaults=true&flat_settings=true`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${createBasicAuth(
            es.credentials.username,
            es.credentials.password
          )}`,
        },
        rejectUnauthorized: false,
      },
      undefined,
      es.ssl
    );

    if (statusCode !== 200) {
      log.warning(`Failed to get cluster settings: HTTP ${statusCode}`);
      return undefined;
    }

    const settings = JSON.parse(data);
    return (
      settings.persistent?.['xpack.inference.elastic.url'] ||
      settings.transient?.['xpack.inference.elastic.url'] ||
      settings.defaults?.['xpack.inference.elastic.url'] ||
      undefined
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warning(`Error fetching cluster settings: ${message}`);
    return undefined;
  }
};

export const ensureEis = async ({ log }: { log: ToolingLog }): Promise<void> => {
  log.info('Setting up Cloud Connected Mode for EIS');

  const es = await getES(log);

  const eisEndpoint = await getEisEndpoint(es, log);
  if (eisEndpoint) {
    log.info(`EIS endpoint: ${chalk.cyan(eisEndpoint)}`);
  } else {
    log.warning(
      `Could not detect xpack.inference.elastic.url — make sure Elasticsearch was started with ${chalk.cyan(
        '-E xpack.inference.elastic.url=...'
      )}`
    );
  }

  const apiKey = await resolveCcmApiKey(log);
  await setCcmApiKey(apiKey, es, log);

  log.write('');
  log.write(`${chalk.green('✔')} EIS API key successfully set in Cloud Connected Mode`);
  log.write('');
};

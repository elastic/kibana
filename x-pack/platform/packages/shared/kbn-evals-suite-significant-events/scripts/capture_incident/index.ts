/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import { createKibanaClient } from '@kbn/kibana-api-cli';
import type { ToolingLog } from '@kbn/tooling-log';
import { captureIncidentSnapshot } from './incident_snapshot';

interface ConnectionFlags {
  'kibana-url'?: string;
  'es-url'?: string;
  'es-api-key'?: string;
}

const createEsClientFromUrl = (esUrl: string, apiKey?: string): Client => {
  const { protocol, host, pathname, username, password } = new URL(esUrl);

  return new Client({
    node: `${protocol}//${host}${pathname}`,
    auth: apiKey ? { apiKey } : username && password ? { username, password } : undefined,
  });
};

const getEsClient = async (flags: ConnectionFlags, log: ToolingLog): Promise<Client> => {
  const { 'es-url': esUrl, 'es-api-key': esApiKey, 'kibana-url': kibanaUrl } = flags;

  if (esApiKey && !esUrl) {
    throw new Error(
      '--es-api-key requires --es-url. API key auth is not supported when connecting through Kibana (--kibana-url).'
    );
  }

  if (esUrl) {
    return createEsClientFromUrl(esUrl, esApiKey);
  }

  const kibanaClient = await createKibanaClient({
    log,
    signal: new AbortController().signal,
    baseUrl: kibanaUrl,
  });
  return kibanaClient.es;
};

run(
  async ({ log, flags }) => {
    const { config: configPath, 'dry-run': dryRun } = flags as ConnectionFlags & {
      config?: string;
      'dry-run'?: boolean;
    };

    if (!configPath) {
      throw new Error('--config is required');
    }

    const esClient = await getEsClient(flags as ConnectionFlags, log);

    log.info(`Capture Incident Snapshot`);
    log.info(`=========================`);

    await captureIncidentSnapshot({
      esClient,
      log,
      configPath,
      dryRun: Boolean(dryRun),
    });
  },
  {
    description:
      'Remote-reindex a curated incident from a source cluster into local ES and snapshot to GCS',
    flags: {
      string: ['config', 'kibana-url', 'es-url', 'es-api-key'],
      boolean: ['dry-run'],
      help: `
      Usage: node scripts/capture_incident_snapshot.js --config <path> [options]

      --config            (required) Path to the incident config file (.yml/.yaml/.json)

      --dry-run           Validate config + prerequisites and print the reindex/snapshot
                          request bodies without mutating anything

      --es-url            Local Elasticsearch URL with credentials
                          Example: http://elastic:changeme@localhost:9200

      --es-api-key        Local Elasticsearch API key (base64 encoded)
                          When provided, overrides credentials in --es-url

      --kibana-url        Kibana URL (ES requests proxied through Kibana)
                          Example: http://localhost:5601

      The source (Overview) API key is read from the OVERVIEW_API_KEY environment
      variable (preferred) or the config's "source.apiKey".
      `,
    },
  }
);

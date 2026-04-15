/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ScoutTestConfig, ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { apiTest as baseApiTest, mergeTests } from '@kbn/scout';
import { synthtraceFixture } from '@kbn/scout-synthtrace';
import { createEsClientForTesting } from '@kbn/test-es-server';

interface AgentBuilderApiFixtures {
  /**
   * Elasticsearch client for Agent Builder system indices (`.chat-*`).
   * Uses `servers.elasticsearch` credentials from the saved Scout metadata when present
   * (typically `kibana_system` in stateful); otherwise falls back to `config.auth` (same as `esClient`).
   */
  chatSystemEsClient: Client;
}

interface ScoutServersMetadata {
  config?: {
    servers?: {
      elasticsearch?: { username?: string; password?: string };
    };
  };
}

const elasticsearchCredentialsForSystemIndices = (
  scoutTestConfig: ScoutTestConfig
): { username: string; password: string } => {
  const esServer = (scoutTestConfig.metadata as ScoutServersMetadata | undefined)?.config?.servers
    ?.elasticsearch;
  if (esServer?.username && esServer?.password) {
    return { username: esServer.username, password: esServer.password };
  }
  return scoutTestConfig.auth;
};

const elasticsearchUrlWithCredentials = (
  scoutTestConfig: ScoutTestConfig,
  username: string,
  password: string
): string => {
  const url = new URL(scoutTestConfig.hosts.elasticsearch);
  url.username = username;
  url.password = password;
  return url.toString();
};

export const apiTest = mergeTests(baseApiTest, synthtraceFixture).extend<
  ScoutTestFixtures & AgentBuilderApiFixtures,
  ScoutWorkerFixtures
>({
  chatSystemEsClient: [
    async ({ config }, use) => {
      const credentials = elasticsearchCredentialsForSystemIndices(config);
      const client = createEsClientForTesting({
        esUrl: elasticsearchUrlWithCredentials(config, credentials.username, credentials.password),
        isCloud: config.isCloud,
      });
      await use(client);
      await client.close();
    },
    { scope: 'worker' },
  ],
});

export * as testData from './constants';

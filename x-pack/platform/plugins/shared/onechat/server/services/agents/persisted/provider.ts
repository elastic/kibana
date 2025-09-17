/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { WritableAgentProvider, AgentProviderFn } from '../agent_source';
import type { ToolsServiceStart } from '../../tools';
import { createClient } from './client';

export const createPersistedProviderFn =
  (opts: {
    security: SecurityServiceStart;
    elasticsearch: ElasticsearchServiceStart;
    toolsService: ToolsServiceStart;
    logger: Logger;
  }): AgentProviderFn<false> =>
  ({ request }) => {
    return createPersistedProvider({
      ...opts,
      request,
    });
  };

const createPersistedProvider = async ({
  request,
  security,
  elasticsearch,
  toolsService,
  logger,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  toolsService: ToolsServiceStart;
  logger: Logger;
}): Promise<WritableAgentProvider> => {
  const client = await createClient({ elasticsearch, logger, request, security, toolsService });

  return {
    id: 'persisted',
    readonly: false,
    has: (agentId: string) => {
      return client.has(agentId);
    },
    get: (agentId: string) => {
      // TODO: convert
      return client.get(agentId);
    },
    list: (opts) => {
      // TODO: convert
      return client.list(opts);
    },
    create: (createRequest) => {
      // TODO: convert
      return client.create(createRequest);
    },
    update: (agentId, update) => {
      // TODO: convert
      return client.update(agentId, update);
    },
    delete: (agentId: string) => {
      return client.delete({ id: agentId });
    },
  };
};

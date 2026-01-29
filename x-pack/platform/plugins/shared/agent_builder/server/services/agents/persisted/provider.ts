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
import type { InternalAgentDefinition } from '../agent_registry';
import type { PersistedAgentDefinition } from './types';

export const createPersistedProviderFn =
  (opts: {
    security: SecurityServiceStart;
    elasticsearch: ElasticsearchServiceStart;
    toolsService: ToolsServiceStart;
    logger: Logger;
  }): AgentProviderFn<false> =>
  ({ request, space }) => {
    return createPersistedProvider({
      ...opts,
      request,
      space,
    });
  };

const createPersistedProvider = async ({
  space,
  request,
  security,
  elasticsearch,
  toolsService,
  logger,
}: {
  space: string;
  request: KibanaRequest;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  toolsService: ToolsServiceStart;
  logger: Logger;
}): Promise<WritableAgentProvider> => {
  const client = await createClient({
    elasticsearch,
    logger,
    request,
    security,
    toolsService,
    space,
  });

  return {
    id: 'persisted',
    readonly: false,
    has: (agentId: string) => {
      return client.has(agentId);
    },
    get: async (agentId: string) => {
      const definition = await client.get(agentId);
      return toInternalDefinition({ definition });
    },
    list: async (opts) => {
      const definitions = await client.list(opts);
      return definitions.map((definition) => toInternalDefinition({ definition }));
    },
    create: async (createRequest) => {
      const definition = await client.create(createRequest);
      return toInternalDefinition({ definition });
    },
    update: async (agentId, update) => {
      const definition = await client.update(agentId, update);
      return toInternalDefinition({ definition });
    },
    delete: (agentId: string) => {
      return client.delete({ id: agentId });
    },
  };
};

export const toInternalDefinition = ({
  definition,
}: {
  definition: PersistedAgentDefinition;
}): InternalAgentDefinition => {
  return {
    ...definition,
    readonly: false,
    isAvailable: () => {
      return { status: 'available' };
    },
  };
};

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
import {
  agentBuilderDefaultAgentId,
  createBadRequestError,
  isAgentNotFoundError,
} from '@kbn/agent-builder-common';
import type { AgentAvailabilityConfig } from '@kbn/agent-builder-server/agents';
import type { GetAgentOptions, WritableAgentProvider, AgentProviderFn } from '../agent_source';
import type { ToolsServiceStart } from '../../tools';
import { AgentAvailabilityCache } from '../builtin/availability_cache';
import { createClient } from './client';
import type { AgentClient } from './client';
import type { InternalAgentDefinition } from '../agent_registry';
import type { PersistedAgentDefinitionWithPermissions } from './types';
import { getDefaultAgentCreateRequest } from '../default_agent_definition';

export const createPersistedProviderFn = (opts: {
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  toolsService: ToolsServiceStart;
  logger: Logger;
  availabilityByAgentId: Map<string, AgentAvailabilityConfig>;
}): AgentProviderFn<false> => {
  const availabilityCache = new AgentAvailabilityCache();
  return ({ request, space }) => {
    return createPersistedProvider({
      ...opts,
      request,
      space,
      availabilityCache,
    });
  };
};

const ensureDefaultAgent = async (
  client: AgentClient
): Promise<PersistedAgentDefinitionWithPermissions> => {
  return client.ensureDefaultAgent(getDefaultAgentCreateRequest());
};

const createPersistedProvider = async ({
  space,
  request,
  security,
  elasticsearch,
  toolsService,
  logger,
  availabilityByAgentId,
  availabilityCache,
}: {
  space: string;
  request: KibanaRequest;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
  toolsService: ToolsServiceStart;
  logger: Logger;
  availabilityByAgentId: Map<string, AgentAvailabilityConfig>;
  availabilityCache: AgentAvailabilityCache;
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
    has: async (agentId: string) => {
      const exists = await client.has(agentId);
      if (!exists && agentId === agentBuilderDefaultAgentId) {
        await ensureDefaultAgent(client);
        return true;
      }
      return exists;
    },
    get: async (agentId: string, opts?: GetAgentOptions) => {
      const access = opts?.access ?? 'read';
      try {
        const definition = await client.getWithAccess(agentId, access);
        return toInternalDefinition({ definition, availabilityByAgentId, availabilityCache });
      } catch (e) {
        if (agentId === agentBuilderDefaultAgentId && isAgentNotFoundError(e)) {
          const definition = await ensureDefaultAgent(client);
          return toInternalDefinition({ definition, availabilityByAgentId, availabilityCache });
        }
        throw e;
      }
    },
    list: async (opts) => {
      const definitions = await client.list(opts);
      const ids = definitions.map(({ id }) => id);

      if (!ids.includes(agentBuilderDefaultAgentId)) {
        const defaultAgent = await ensureDefaultAgent(client);
        definitions.push(defaultAgent);
      }

      return definitions.map((definition) =>
        toInternalDefinition({ definition, availabilityByAgentId, availabilityCache })
      );
    },
    getIds: async (opts) => {
      const ids = await client.getIds(opts);

      if (!ids.includes(agentBuilderDefaultAgentId)) {
        const defaultAgent = await ensureDefaultAgent(client);
        ids.push(defaultAgent.id);
      }

      return ids;
    },
    create: async (createRequest) => {
      if (createRequest.id === agentBuilderDefaultAgentId) {
        throw createBadRequestError('The default agent cannot be manually created');
      }
      const definition = await client.create(createRequest);
      return toInternalDefinition({ definition, availabilityByAgentId, availabilityCache });
    },
    update: async (agentId, update) => {
      const definition = await client.update(agentId, update);
      return toInternalDefinition({ definition, availabilityByAgentId, availabilityCache });
    },
    delete: (agentId: string) => {
      return client.delete({ id: agentId });
    },
    getAccessControl: async (agentId: string) => {
      const result = await client.getAccessControl(agentId);
      return result;
    },
    updateAccessControl: async (agentId, update) => {
      return client.updateAccessControl(agentId, update);
    },
  };
};

export const toInternalDefinition = ({
  definition,
  availabilityByAgentId,
  availabilityCache,
}: {
  definition: PersistedAgentDefinitionWithPermissions;
  availabilityByAgentId: Map<string, AgentAvailabilityConfig>;
  availabilityCache: AgentAvailabilityCache;
}): InternalAgentDefinition => {
  return {
    ...definition,
    readonly: false,
    isAvailable: async (ctx) => {
      const availability = availabilityByAgentId.get(definition.id);
      return availability
        ? availabilityCache.getOrCompute(definition.id, availability, ctx)
        : { status: 'available' };
    },
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { AgentType, createAgentNotFoundError } from '@kbn/agent-builder-common';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import type { BuiltinAgentRegistry } from './registry';
import type { AgentProviderFn, ReadonlyAgentProvider } from '../agent_source';
import type { InternalAgentDefinition } from '../agent_registry';
import { AgentAvailabilityCache } from './availability_cache';

export const createBuiltinProviderFn = ({
  registry,
}: {
  registry: BuiltinAgentRegistry;
}): AgentProviderFn<true> => {
  const availabilityCache = new AgentAvailabilityCache();
  return ({ request }) => {
    return registryToProvider({ registry, request, availabilityCache });
  };
};

const registryToProvider = ({
  registry,
  request,
  availabilityCache,
}: {
  registry: BuiltinAgentRegistry;
  request: KibanaRequest;
  availabilityCache: AgentAvailabilityCache;
}): ReadonlyAgentProvider => {
  return {
    id: 'builtin',
    readonly: true,
    has: (agentId: string) => {
      return registry.has(agentId);
    },
    get: (agentId: string) => {
      const definition = registry.get(agentId);
      if (!definition) {
        throw createAgentNotFoundError({ agentId });
      }
      return toInternalDefinition({ definition, availabilityCache });
    },
    list: (opts) => {
      const definitions = registry.list();
      return Promise.all(
        definitions.map((definition) => toInternalDefinition({ definition, availabilityCache }))
      );
    },
  };
};

export const toInternalDefinition = async ({
  definition,
  availabilityCache,
}: {
  definition: BuiltInAgentDefinition;
  availabilityCache: AgentAvailabilityCache;
}): Promise<InternalAgentDefinition> => {
  return {
    ...definition,
    type: AgentType.chat,
    readonly: true,
    isAvailable: async (ctx) => {
      if (definition.availability) {
        return availabilityCache.getOrCompute(definition.id, definition.availability, ctx);
      } else {
        return { status: 'available' };
      }
    },
  };
};

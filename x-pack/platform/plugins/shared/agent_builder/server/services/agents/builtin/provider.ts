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

export const createBuiltinProviderFn =
  ({ registry }: { registry: BuiltinAgentRegistry }): AgentProviderFn<true> =>
  ({ request }) => {
    return registryToProvider({ registry, request });
  };

const registryToProvider = ({
  registry,
  request,
}: {
  registry: BuiltinAgentRegistry;
  request: KibanaRequest;
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
      return toInternalDefinition({ definition });
    },
    list: (opts) => {
      const definitions = registry.list();
      return Promise.all(definitions.map((definition) => toInternalDefinition({ definition })));
    },
  };
};

export const toInternalDefinition = async ({
  definition,
}: {
  definition: BuiltInAgentDefinition;
}): Promise<InternalAgentDefinition> => {
  return {
    ...definition,
    type: AgentType.chat,
    readonly: true,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { AgentType, createAgentNotFoundError } from '@kbn/onechat-common';
import type {
  BuiltInAgentDefinition,
  BuiltInAgentDefinitionContext,
} from '@kbn/onechat-server/agents';
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
      return toInternalDefinition({ definition, request });
    },
    list: (opts) => {
      const definitions = registry.list();
      return Promise.all(
        definitions.map((definition) => toInternalDefinition({ definition, request }))
      );
    },
  };
};

export const createDynamicContext = ({
  request,
}: {
  request: KibanaRequest;
}): BuiltInAgentDefinitionContext => {
  return { request };
};

export const toInternalDefinition = async ({
  definition,
  request,
}: {
  definition: BuiltInAgentDefinition;
  request: KibanaRequest;
}): Promise<InternalAgentDefinition> => {
  const context = createDynamicContext({ request });

  const configuration =
    typeof definition.configuration === 'function'
      ? await definition.configuration(context)
      : definition.configuration;

  return {
    ...definition,
    configuration,
    type: AgentType.chat,
    readonly: true,
  };
};

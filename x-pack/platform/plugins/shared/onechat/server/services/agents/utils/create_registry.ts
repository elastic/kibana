/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  AgentRegistry,
  Runner,
  ExecutableAgent,
  ExecutableAgentHandlerFn,
} from '@kbn/onechat-server';
import type {
  InternalAgentRegistry,
  AgentProviderWithId,
  AgentWithIdProvider,
  AgentDefinitionWithProviderId,
} from '../types';
import { combineAgentProviders } from './combine_providers';

export const createInternalRegistry = ({
  providers,
  getRunner,
}: {
  providers: AgentProviderWithId[];
  getRunner: () => Runner;
}): InternalAgentRegistry => {
  const globalProvider = combineAgentProviders(...providers);
  const publicRegistry = internalProviderToPublic({ provider: globalProvider, getRunner });
  return Object.assign(globalProvider, {
    asPublicRegistry: () => publicRegistry,
  });
};

export const internalProviderToPublic = ({
  provider,
  getRunner,
}: {
  provider: AgentWithIdProvider;
  getRunner: () => Runner;
}): AgentRegistry => {
  return {
    has(options) {
      return provider.has(options);
    },
    async get(options) {
      const agent = await provider.get(options);
      return toExecutableAgent({ agent, getRunner, request: options.request });
    },
    async list(options) {
      const agents = await provider.list(options);
      return agents.map((agent) =>
        toExecutableAgent({ agent, getRunner, request: options.request })
      );
    },
  };
};

export const toExecutableAgent = ({
  agent,
  getRunner,
  request,
}: {
  agent: AgentDefinitionWithProviderId;
  getRunner: () => Runner;
  request: KibanaRequest;
}): ExecutableAgent => {
  return {
    type: agent.type,
    agentId: agent.id,
    providerId: agent.providerId,
    description: agent.description,
    execute: createExecuteHandler({ agentId: agent.id, request, getRunner }),
  };
};

export const createExecuteHandler = <TParams = unknown, TResult = unknown>({
  agentId,
  request,
  getRunner,
}: {
  agentId: string;
  getRunner: () => Runner;
  request: KibanaRequest;
}): ExecutableAgentHandlerFn<TParams, TResult> => {
  return (params) => {
    return getRunner().runAgent({
      ...params,
      agentId,
      request,
    });
  };
};

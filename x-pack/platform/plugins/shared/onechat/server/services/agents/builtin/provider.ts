/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { BuiltinAgentRegistry } from './registry';
import type { ReadonlyAgentProvider, AgentProviderFn } from '../agent_source';

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
      // TODO: convert to format.
      return registry.get(agentId);
    },

    list: (opts) => {
      // TODO: convert to format.
      return registry.list();
    },
  };
};

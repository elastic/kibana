/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentWithIdProvider,
  AgentProviderWithId,
  AgentDefinitionWithProviderId,
} from '../types';

/**
 * Creates an agent provider that combines multiple providers.
 *
 * Note: order matters - providers will be checked in the order they are in the list (in case of ID conflict)
 */
export const combineAgentProviders = (...providers: AgentProviderWithId[]): AgentWithIdProvider => {
  const combined: AgentWithIdProvider = {
    has: async (options) => {
      for (const provider of providers) {
        if (await provider.has(options)) {
          return true;
        }
      }
      return false;
    },
    get: async (options) => {
      for (const provider of providers) {
        if (await provider.has(options)) {
          const agent = await provider.get(options);
          return {
            ...agent,
            providerId: provider.id,
          };
        }
      }
      throw new Error(`Agent with id ${options.agentId} not found`);
    },
    list: async (options) => {
      const results = await Promise.all(
        providers.map(async (provider) => {
          const agents = await provider.list(options);
          return agents.map((agent) => ({
            ...agent,
            providerId: provider.id,
          }));
        })
      );
      return results.reduce(
        (acc, result) => [...acc, ...result],
        [] as AgentDefinitionWithProviderId[]
      );
    },
  };

  return combined;
};

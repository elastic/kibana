/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentProvider } from '@kbn/onechat-server';

/**
 * Creates a tool provider that combines multiple tool providers.
 *
 * Note: order matters - providers will be checked in the order they are in the list (in case of ID conflict)
 */
export const combineToolProviders = (...providers: AgentProvider[]): AgentProvider => {
  const combined: AgentProvider = {
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
          return provider.get(options);
        }
      }
      throw new Error(`Agent with id ${options.agentId} not found`);
    },
  };

  return combined;
};

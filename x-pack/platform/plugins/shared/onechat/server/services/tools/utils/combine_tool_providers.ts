/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ToolProvider,
  RegisteredTool,
  ToolProviderHasOptions,
  ToolProviderGetOptions,
  ToolProviderListOptions,
} from '@kbn/onechat-server';

/**
 * Creates a tool provider that combines multiple tool providers.
 *
 * Note: order matters - providers will be checked in the order they are provided (e.g. in case of id conflicts).
 */
export const combineToolProviders = (...providers: ToolProvider[]): ToolProvider => {
  return {
    has: async (options: ToolProviderHasOptions) => {
      for (const provider of providers) {
        const providerHasTool = await provider.has(options);
        if (providerHasTool) {
          return true;
        }
      }
      return false;
    },
    get: async (options: ToolProviderGetOptions) => {
      for (const provider of providers) {
        if (await provider.has(options)) {
          return provider.get(options);
        }
      }
      throw new Error(`Tool with id ${options.toolId} not found`);
    },
    list: async (options: ToolProviderListOptions) => {
      const tools: RegisteredTool[] = [];
      const toolIds = new Set<string>();

      for (const provider of providers) {
        const providerTools = await provider.list(options);
        for (const tool of providerTools) {
          if (!toolIds.has(tool.id)) {
            tools.push(tool);
            toolIds.add(tool.id);
          }
        }
      }

      return tools;
    },
  };
};

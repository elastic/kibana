/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ToolProviderHasOptions,
  ToolProviderGetOptions,
  ToolProviderListOptions,
} from '@kbn/onechat-server';
import type { InternalToolProvider, RegisteredToolWithMeta } from '../types';

/**
 * Creates a tool provider that combines multiple tool providers.
 *
 * Note: order matters - providers will be checked in the order they are in the list (in case of ID conflict)
 */
export const combineToolProviders = (
  ...providers: InternalToolProvider[]
): InternalToolProvider => {
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
      const tools: RegisteredToolWithMeta[] = [];
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

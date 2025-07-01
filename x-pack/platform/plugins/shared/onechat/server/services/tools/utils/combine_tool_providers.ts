/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ToolProviderId,
  toStructuredToolIdentifier,
  unknownToolProviderId,
} from '@kbn/onechat-common';
import type {
  RegisteredTool,
  ToolProviderGetOptions,
  ToolProviderHasOptions,
  ToolProviderListOptions,
} from '@kbn/onechat-server';
import {
  InternalToolProvider,
  RegisteredToolProviderWithId,
  RegisteredToolWithMeta,
} from '../types';

/**
 * Creates a tool provider that combines multiple tool providers.
 *
 * Note: order matters - providers will be checked in the order they are in the list (in case of ID conflict)
 */
export const combineToolProviders = (
  ...providers: RegisteredToolProviderWithId[]
): InternalToolProvider => {
  const addMeta = (tool: RegisteredTool, providerId: ToolProviderId): RegisteredToolWithMeta => {
    return {
      ...tool,
      meta: {
        ...tool.meta,
        tags: tool.meta?.tags ?? [],
        providerId,
      },
    };
  };

  return {
    has: async (options: ToolProviderHasOptions) => {
      for (const provider of providers) {
        const { toolId, providerId } = toStructuredToolIdentifier(options.toolId);
        if (providerId === provider.id || providerId === unknownToolProviderId) {
          const providerHasTool = await provider.has({
            ...options,
            toolId,
          });
          if (providerHasTool) {
            return true;
          }
        }
      }
      return false;
    },
    get: async (options: ToolProviderGetOptions) => {
      for (const provider of providers) {
        const { toolId, providerId } = toStructuredToolIdentifier(options.toolId);
        if (providerId === provider.id || providerId === unknownToolProviderId) {
          const providerHasTool = await provider.has({
            ...options,
            toolId,
          });
          if (providerHasTool) {
            const tool = await provider.get({
              ...options,
              toolId,
            });
            return addMeta(tool, provider.id);
          }
        }
      }
      throw new Error(`Tool with id ${options.toolId} not found`);
    },
    list: async (options: ToolProviderListOptions) => {
      const tools: RegisteredToolWithMeta[] = [];

      for (const provider of providers) {
        const providerTools = await provider.list(options);
        for (const tool of providerTools) {
          tools.push(addMeta(tool, provider.id));
        }
      }

      return tools;
    },
  };
};

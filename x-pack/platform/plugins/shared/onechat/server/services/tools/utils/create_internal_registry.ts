/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExecutableTool,
  Runner,
  ToolProviderGetOptions,
  ToolProviderHasOptions,
  ToolProviderListOptions,
} from '@kbn/onechat-server';
import {
  InternalToolRegistry,
  InternalToolProvider,
  RegisteredToolProviderWithId,
  ScopedPublicToolRegistryFactoryFn,
  PublicToolRegistry,
} from '../types';
import { combineToolProviders } from './combine_tool_providers';
import { toExecutableTool } from './tool_conversion';

export const createInternalRegistry = ({
  providers,
  getRunner,
}: {
  providers: RegisteredToolProviderWithId[];
  getRunner: () => Runner;
}): InternalToolRegistry => {
  const mainProvider = combineToolProviders(...providers);
  const publicRegistry = internalProviderToPublic({ provider: mainProvider, getRunner });

  return Object.assign(mainProvider, {
    asPublicRegistry: () => publicRegistry,
    asScopedPublicRegistry: createPublicFactory(publicRegistry),
  });
};

export const internalProviderToPublic = ({
  provider,
  getRunner,
}: {
  provider: InternalToolProvider;
  getRunner: () => Runner;
}): PublicToolRegistry => {
  return {
    has(options: ToolProviderHasOptions): Promise<boolean> {
      return provider.has(options);
    },
    async get(options: ToolProviderGetOptions): Promise<ExecutableTool> {
      const tool = await provider.get(options);
      return toExecutableTool({ tool, runner: getRunner(), request: options.request });
    },
    async list(options: ToolProviderListOptions): Promise<ExecutableTool[]> {
      const tools = await provider.list(options);
      return tools.map((tool) =>
        toExecutableTool({ tool, runner: getRunner(), request: options.request })
      );
    },
  };
};

export const createPublicFactory = (
  provider: PublicToolRegistry
): ScopedPublicToolRegistryFactoryFn => {
  return ({ request }) => {
    return {
      has: (toolId) => {
        return provider.has({ toolId, request });
      },
      get: async (toolId) => {
        return provider.get({ toolId, request });
      },
      list: async (options) => {
        return provider.list({ request, ...options });
      },
    };
  };
};

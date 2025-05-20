/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolProvider } from '@kbn/onechat-server';
import type { ScopedPublicToolRegistryFactoryFn } from '../types';
import { toolToDescriptor } from './tool_to_descriptor';

export const toolProviderToPublicRegistryFactory = ({
  provider,
}: {
  provider: ToolProvider;
}): ScopedPublicToolRegistryFactoryFn => {
  return ({ request }) => {
    return {
      has: (toolId) => {
        return provider.has({ toolId, request });
      },
      get: async (toolId) => {
        const tool = await provider.get({ toolId, request });
        return toolToDescriptor(tool);
      },
      list: async (options) => {
        const tools = await provider.list({ request, ...options });
        return tools.map(toolToDescriptor);
      },
    };
  };
};

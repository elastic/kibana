/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolProvider, Runner, ToolRegistry } from '@kbn/agent-builder-server';
import { toExecutableTool } from '../../tools/utils/tool_conversion';

export const createToolProvider = ({
  registry,
  runner,
  request,
}: {
  registry: ToolRegistry;
  runner: Runner;
  request: KibanaRequest;
}): ToolProvider => {
  return {
    has: async ({ toolId }) => {
      return registry.has(toolId);
    },
    get: async ({ toolId }) => {
      const tool = await registry.get(toolId);
      return toExecutableTool({ tool, runner, request });
    },
    list: async () => {
      const tools = await registry.list();
      return tools.map((tool) => toExecutableTool({ tool, runner, request }));
    },
  };
};

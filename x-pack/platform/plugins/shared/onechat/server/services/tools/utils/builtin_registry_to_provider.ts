/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodRawShape } from '@kbn/zod';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  ToolProvider,
  Runner,
  ToolProviderGetOptions,
  RegisteredTool,
  ExecutableTool,
  ToolProviderHasOptions,
  ToolProviderListOptions,
} from '@kbn/onechat-server';
import type { BuiltinToolRegistry } from '../builtin_registry';

export const builtinRegistryToProvider = ({
  registry,
  getRunner,
}: {
  registry: BuiltinToolRegistry;
  getRunner: () => Runner;
}): ToolProvider => {
  return {
    has(options: ToolProviderHasOptions): Promise<boolean> {
      return registry.has(options);
    },
    async get(options: ToolProviderGetOptions): Promise<ExecutableTool> {
      const tool = await registry.get(options);
      return toExecutableTool({ tool, runner: getRunner(), request: options.request });
    },
    async list(options: ToolProviderListOptions): Promise<ExecutableTool[]> {
      const tools = await registry.list(options);
      return tools.map((tool) =>
        toExecutableTool({ tool, runner: getRunner(), request: options.request })
      );
    },
  };
};

export const toExecutableTool = <RunInput extends ZodRawShape, RunOutput>({
  tool,
  runner,
  request,
}: {
  tool: RegisteredTool<RunInput, RunOutput>;
  runner: Runner;
  request: KibanaRequest;
}): ExecutableTool<RunInput, RunOutput> => {
  const { handler, ...toolParts } = tool;

  return {
    ...toolParts,
    execute: (params) => {
      return runner.runTool({ ...params, toolId: tool.id, request });
    },
  };
};

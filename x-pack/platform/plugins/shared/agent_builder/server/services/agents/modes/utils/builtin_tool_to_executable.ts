/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type {
  BuiltinToolDefinition,
  ExecutableTool,
  ScopedRunner,
} from '@kbn/agent-builder-server';

/**
 * Converts a builtin tool definition to an executable tool that runs through the runner.
 */
export const builtinToolToExecutable = ({
  tool,
  runner,
}: {
  tool: BuiltinToolDefinition;
  runner: ScopedRunner;
}): ExecutableTool => {
  return {
    id: tool.id,
    type: ToolType.builtin,
    description: tool.description,
    tags: tool.tags,
    configuration: {},
    readonly: true,
    getSchema: () => tool.schema,
    execute: async (params) => {
      return runner.runInternalTool({
        ...params,
        tool: {
          id: tool.id,
          type: ToolType.builtin,
          description: tool.description,
          tags: tool.tags,
          configuration: {},
          readonly: true,
          confirmation: { askUser: 'never' },
          isAvailable: async () => ({ status: 'available' as const }),
          getSchema: () => tool.schema,
          getHandler: () => tool.handler,
        },
      });
    },
  };
};

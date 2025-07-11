/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { ToolType, createToolNotFoundError } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import {
  InternalToolDefinition,
  ToolTypeDefinition,
  ReadonlyToolTypeClient,
} from '../tool_provider';
import { BuiltinToolRegistry } from './builtin_registry';

export const createBuiltInToolTypeDefinition = ({
  registry,
}: {
  registry: BuiltinToolRegistry;
}): ToolTypeDefinition<ToolType.builtin, {}> => {
  return {
    toolType: ToolType.builtin,
    readonly: true,
    getClient: ({ request }) => createBuiltinToolClient({ registry, request }),
  };
};

export const createBuiltinToolClient = ({
  registry,
}: {
  registry: BuiltinToolRegistry;
  request: KibanaRequest;
}): ReadonlyToolTypeClient<{}> => {
  return {
    has(toolId: string) {
      return registry.has(toolId);
    },
    get(toolId) {
      const tool = registry.get(toolId);
      if (!tool) {
        throw createToolNotFoundError({ toolId, toolType: ToolType.builtin });
      }
      return convertTool(tool);
    },
    list() {
      const tools = registry.list();
      return tools.map(convertTool);
    },
  };
};

export const convertTool = (tool: BuiltinToolDefinition): InternalToolDefinition => {
  return {
    id: tool.id,
    type: ToolType.builtin,
    description: tool.description,
    tags: tool.tags,
    configuration: {},
    schema: tool.schema,
    handler: tool.handler,
  };
};

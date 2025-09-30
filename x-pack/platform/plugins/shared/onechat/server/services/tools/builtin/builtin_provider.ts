/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { ToolType, createToolNotFoundError } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { ToolProviderFn, ReadonlyToolProvider } from '../tool_provider';
import type { BuiltinToolRegistry } from './builtin_registry';
import type { AnyToolTypeDefinition } from '../tool_types';

export const createBuiltinProviderFn =
  ({
    registry,
    toolTypes,
  }: {
    registry: BuiltinToolRegistry;
    toolTypes: AnyToolTypeDefinition[];
  }): ToolProviderFn<true> =>
  ({ request }) => {
    return createBuiltinToolProvider({ registry, toolTypes, request });
  };

export const createBuiltinToolProvider = ({
  registry,
}: {
  registry: BuiltinToolRegistry;
  toolTypes: AnyToolTypeDefinition[];
  request: KibanaRequest;
}): ReadonlyToolProvider => {
  return {
    id: 'builtin',
    readonly: true,
    has(toolId: string) {
      return registry.has(toolId);
    },
    get(toolId) {
      const tool = registry.get(toolId);
      if (!tool) {
        throw createToolNotFoundError({ toolId });
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
    readonly: true,
    schema: tool.schema,
    handler: tool.handler,
  };
};

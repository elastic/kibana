/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiSettingsServiceStart, SavedObjectsServiceStart } from '@kbn/core/server';
import { ToolType, createToolNotFoundError } from '@kbn/onechat-common';
import { platformCoreTools } from '@kbn/onechat-common/tools/constants';
import { AGENT_BUILDER_CREATE_VISUALIZATIONS_SETTING_ID } from '@kbn/management-settings-ids';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { InternalToolDefinition, ToolSource, ReadonlyToolTypeClient } from '../tool_provider';
import type { BuiltinToolRegistry } from './builtin_registry';

export const createBuiltInToolSource = ({
  registry,
  uiSettings,
  savedObjects,
}: {
  registry: BuiltinToolRegistry;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
}): ToolSource<ToolType.builtin> => {
  return {
    id: 'builtin',
    toolTypes: [ToolType.builtin],
    readonly: true,
    getClient: async ({ request }) => {
      const soClient = savedObjects.getScopedClient(request);
      const uiSettingsClient = uiSettings.asScopedToClient(soClient);
      const createVisualizationsEnabled = await uiSettingsClient.get<boolean>(
        AGENT_BUILDER_CREATE_VISUALIZATIONS_SETTING_ID
      );
      return createBuiltinToolClient({ registry, createVisualizationsEnabled });
    },
  };
};

export const createBuiltinToolClient = ({
  registry,
  createVisualizationsEnabled,
}: {
  registry: BuiltinToolRegistry;
  createVisualizationsEnabled: boolean;
}): ReadonlyToolTypeClient<{}> => {
  const isToolEnabled = (toolId: string): boolean => {
    if (toolId === platformCoreTools.createVisualization) {
      return createVisualizationsEnabled;
    }
    return true;
  };

  return {
    has(toolId: string) {
      if (!registry.has(toolId)) {
        return false;
      }
      return isToolEnabled(toolId);
    },
    get(toolId) {
      const tool = registry.get(toolId);
      if (!tool) {
        throw createToolNotFoundError({ toolId });
      }
      if (!isToolEnabled(toolId)) {
        throw createToolNotFoundError({ toolId });
      }
      return convertTool(tool);
    },
    list() {
      const tools = registry.list();
      return tools.filter((tool) => isToolEnabled(tool.id)).map(convertTool);
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

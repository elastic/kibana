/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiSettingsServiceStart, SavedObjectsServiceStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolType } from '@kbn/onechat-common';
import { createToolNotFoundError, createBadRequestError } from '@kbn/onechat-common';
import { platformCoreTools } from '@kbn/onechat-common/tools/constants';
import { AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID } from '@kbn/management-settings-ids';
import type { ToolProviderFn, ReadonlyToolProvider } from '../tool_provider';
import type { BuiltinToolRegistry } from './builtin_registry';
import type {
  AnyToolTypeDefinition,
  ToolTypeDefinition,
  BuiltinToolTypeDefinition,
} from '../tool_types/definitions';
import { isDisabledDefinition } from '../tool_types/definitions';
import { convertTool } from './converter';
import { ToolAvailabilityCache } from './availability_cache';

export const createBuiltinProviderFn =
  ({
    registry,
    toolTypes,
    uiSettings,
    savedObjects,
  }: {
    registry: BuiltinToolRegistry;
    toolTypes: AnyToolTypeDefinition[];
    uiSettings: UiSettingsServiceStart;
    savedObjects: SavedObjectsServiceStart;
  }): ToolProviderFn<true> =>
  async ({ request, space }) => {
    const soClient = savedObjects.getScopedClient(request);
    const uiSettingsClient = uiSettings.asScopedToClient(soClient);
    const createVisualizationsEnabled = await uiSettingsClient.get<boolean>(
      AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID
    );
    return createBuiltinToolProvider({
      registry,
      toolTypes,
      request,
      space,
      createVisualizationsEnabled,
    });
  };

export const createBuiltinToolProvider = ({
  registry,
  toolTypes,
  request,
  space,
  createVisualizationsEnabled,
}: {
  registry: BuiltinToolRegistry;
  toolTypes: AnyToolTypeDefinition[];
  request: KibanaRequest;
  space: string;
  createVisualizationsEnabled: boolean;
}): ReadonlyToolProvider => {
  const definitionMap = toolTypes
    .filter((def) => !isDisabledDefinition(def))
    .reduce((map, def) => {
      map[def.toolType] = def as ToolTypeDefinition | BuiltinToolTypeDefinition;
      return map;
    }, {} as Record<ToolType, ToolTypeDefinition | BuiltinToolTypeDefinition>);

  const isToolEnabled = (toolId: string): boolean => {
    if (toolId === platformCoreTools.createVisualization) {
      return createVisualizationsEnabled;
    }
    return true;
  };
  const context = { spaceId: space, request };

  const availabilityCache = new ToolAvailabilityCache();

  return {
    id: 'builtin',
    readonly: true,
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
      const definition = definitionMap[tool.type];
      if (!definition) {
        throw createBadRequestError(`Unknown type for tool '${toolId}': '${tool.type}'`);
      }
      return convertTool({ tool, definition, context, cache: availabilityCache });
    },
    list() {
      const tools = registry.list();
      return tools
        .filter((tool) => {
          // evict unknown tools - atm it's used for workflow tools if the plugin is disabled.
          return definitionMap[tool.type];
        })
        .filter((tool) => isToolEnabled(tool.id))
        .map((tool) => {
          const definition = definitionMap[tool.type]!;
          return convertTool({ tool, definition, context, cache: availabilityCache });
        });
    },
  };
};

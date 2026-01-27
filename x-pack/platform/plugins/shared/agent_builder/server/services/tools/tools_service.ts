/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchServiceStart,
  Logger,
  UiSettingsServiceStart,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { Runner } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { isAllowedBuiltinTool } from '@kbn/agent-builder-server/allow_lists';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { getCurrentSpaceId } from '../../utils/spaces';
import {
  createBuiltinToolRegistry,
  createBuiltinProviderFn,
  type BuiltinToolRegistry,
} from './builtin';
import type { ToolsServiceSetup, ToolsServiceStart } from './types';
import { getToolTypeDefinitions } from './tool_types';
import { isEnabledDefinition } from './tool_types/definitions';
import { createPersistedProviderFn } from './persisted';
import { createToolRegistry } from './tool_registry';
import { createToolHealthClient } from './health';

export interface ToolsServiceSetupDeps {
  logger: Logger;
  workflowsManagement?: WorkflowsServerPluginSetup;
}

export interface ToolsServiceStartDeps {
  getRunner: () => Runner;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  actions: ActionsPluginStart;
}

export class ToolsService {
  private setupDeps?: ToolsServiceSetupDeps;
  private builtinRegistry: BuiltinToolRegistry;

  constructor() {
    this.builtinRegistry = createBuiltinToolRegistry();
  }

  setup(deps: ToolsServiceSetupDeps): ToolsServiceSetup {
    this.setupDeps = deps;

    return {
      register: (reg) => {
        if (!isAllowedBuiltinTool(reg.id)) {
          throw new Error(
            `Built-in tool with id "${reg.id}" is not in the list of allowed built-in tools.
             Please add it to the list of allowed built-in tools in the "@kbn/agent-builder-server/allow_lists.ts" file.`
          );
        }
        return this.builtinRegistry.register(reg);
      },
    };
  }

  start({
    getRunner,
    elasticsearch,
    spaces,
    uiSettings,
    savedObjects,
    actions,
  }: ToolsServiceStartDeps): ToolsServiceStart {
    const { logger, workflowsManagement } = this.setupDeps!;

    const toolTypes = getToolTypeDefinitions({ workflowsManagement, actions });

    // Compute the set of tool types that have health tracking enabled
    const healthTrackedToolTypes = new Set(
      toolTypes
        .filter(isEnabledDefinition)
        .filter((def) => def.trackHealth === true)
        .map((def) => def.toolType)
    );

    const builtinProviderFn = createBuiltinProviderFn({
      registry: this.builtinRegistry,
      toolTypes,
    });
    const persistedProviderFn = createPersistedProviderFn({
      logger,
      esClient: elasticsearch.client.asInternalUser,
      toolTypes,
    });

    const getRegistry: ToolsServiceStart['getRegistry'] = async ({ request }) => {
      const space = getCurrentSpaceId({ request, spaces });
      const builtinProvider = await builtinProviderFn({ request, space });
      const persistedProvider = await persistedProviderFn({ request, space });
      const healthClient = createToolHealthClient({
        space,
        logger,
        esClient: elasticsearch.client.asInternalUser,
      });

      return createToolRegistry({
        getRunner,
        space,
        request,
        builtinProvider,
        persistedProvider,
        uiSettings,
        savedObjects,
        healthClient,
        healthTrackedToolTypes,
      });
    };

    const getHealthClient: ToolsServiceStart['getHealthClient'] = ({ request }) => {
      const space = getCurrentSpaceId({ request, spaces });
      return createToolHealthClient({
        space,
        logger,
        esClient: elasticsearch.client.asInternalUser,
      });
    };

    return {
      getRegistry,
      getToolDefinitions: () => toolTypes,
      getHealthClient,
    };
  }
}

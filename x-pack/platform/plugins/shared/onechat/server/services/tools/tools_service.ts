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
import type { Runner } from '@kbn/onechat-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { isAllowedBuiltinTool } from '@kbn/onechat-server/allow_lists';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { getCurrentSpaceId } from '../../utils/spaces';
import {
  createBuiltinToolRegistry,
  registerBuiltinTools,
  registerProductDocumentationTool,
  createBuiltinProviderFn,
  type BuiltinToolRegistry,
} from './builtin';
import type { ToolsServiceSetup, ToolsServiceStart } from './types';
import { getToolTypeDefinitions } from './tool_types';
import { createPersistedProviderFn } from './persisted';
import { createToolRegistry } from './tool_registry';
import { getToolTypeInfo } from './utils';

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
  llmTasks?: LlmTasksPluginStart;
}

export class ToolsService {
  private setupDeps?: ToolsServiceSetupDeps;
  private builtinRegistry: BuiltinToolRegistry;

  constructor() {
    this.builtinRegistry = createBuiltinToolRegistry();
  }

  setup(deps: ToolsServiceSetupDeps): ToolsServiceSetup {
    this.setupDeps = deps;
    registerBuiltinTools({ registry: this.builtinRegistry });

    return {
      register: (reg) => {
        if (!isAllowedBuiltinTool(reg.id)) {
          throw new Error(
            `Built-in tool with id "${reg.id}" is not in the list of allowed built-in tools.
             Please add it to the list of allowed built-in tools in the "@kbn/onechat-server/allow_lists.ts" file.`
          );
        }
        return this.builtinRegistry.register(reg);
      },
    };
  }

  async start({
    getRunner,
    elasticsearch,
    spaces,
    uiSettings,
    savedObjects,
    llmTasks,
  }: ToolsServiceStartDeps): Promise<ToolsServiceStart> {
    const { logger, workflowsManagement } = this.setupDeps!;

    // Conditionally register product documentation tool if available
    if (llmTasks) {
      try {
        const isAvailable =
          (await llmTasks.retrieveDocumentationAvailable({
            inferenceId: defaultInferenceEndpoints.ELSER,
          })) ?? false;

        if (isAvailable) {
          registerProductDocumentationTool({ registry: this.builtinRegistry });
          logger.info('Product documentation tool registered');
        } else {
          logger.debug('Product documentation tool not registered: documentation not available');
        }
      } catch (error) {
        logger.warn(`Failed to check product documentation availability: ${error.message}`);
      }
    }

    const toolTypes = getToolTypeDefinitions({ workflowsManagement });

    const builtinProviderFn = createBuiltinProviderFn({
      registry: this.builtinRegistry,
      toolTypes,
      uiSettings,
      savedObjects,
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

      return createToolRegistry({
        getRunner,
        space,
        request,
        builtinProvider,
        persistedProvider,
      });
    };

    return {
      getRegistry,
      getToolTypeInfo: () => getToolTypeInfo(toolTypes),
    };
  }
}

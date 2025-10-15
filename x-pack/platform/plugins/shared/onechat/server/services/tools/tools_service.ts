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
import type { WorkflowsPluginSetup } from '@kbn/workflows-management-plugin/server';
import { isAllowedBuiltinTool } from '@kbn/onechat-server/allow_lists';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { getCurrentSpaceId } from '../../utils/spaces';
import {
  createBuiltinToolRegistry,
  registerBuiltinTools,
  createBuiltinProviderFn,
  type BuiltinToolRegistry,
} from './builtin';
import type { ToolsServiceSetup, ToolsServiceStart } from './types';
import { getToolTypeDefinitions } from './tool_types';
import { createPersistedProviderFn } from './persisted';
import { createMcpProviderFn } from './mcp/mcp_provider';
import { createComposioProviderFn } from './composio/composio_provider';
import { createToolRegistry } from './tool_registry';
import { getToolTypeInfo } from './utils';
import type { McpConnectionManager } from '../mcp/mcp_connection_manager';
import type { ComposioConnectionManager } from '../composio/composio_connection_manager';

export interface ToolsServiceSetupDeps {
  logger: Logger;
  workflowsManagement?: WorkflowsPluginSetup;
  mcpConnectionManager: McpConnectionManager;
  composioConnectionManager?: ComposioConnectionManager;
}

export interface ToolsServiceStartDeps {
  getRunner: () => Runner;
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
  composioConnectionManager?: ComposioConnectionManager;
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

  start({
    getRunner,
    elasticsearch,
    spaces,
    uiSettings,
    savedObjects,
    composioConnectionManager,
  }: ToolsServiceStartDeps): ToolsServiceStart {
    const { logger, workflowsManagement, mcpConnectionManager } = this.setupDeps!;

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
    const mcpProviderFn = createMcpProviderFn({
      connectionManager: mcpConnectionManager,
      logger: logger.get('mcp-provider'),
    });

    // Create Composio provider if configured
    const composioProviderFn = composioConnectionManager
      ? createComposioProviderFn({
          connectionManager: composioConnectionManager,
          logger: logger.get('composio-provider'),
        })
      : undefined;

    const getRegistry: ToolsServiceStart['getRegistry'] = async ({ request }) => {
      const space = getCurrentSpaceId({ request, spaces });
      const builtinProvider = await builtinProviderFn({ request, space });
      const persistedProvider = await persistedProviderFn({ request, space });
      const mcpProvider = await mcpProviderFn({ request, space });
      const composioProvider = composioProviderFn
        ? await composioProviderFn({ request, space })
        : undefined;

      return createToolRegistry({
        getRunner,
        space,
        request,
        builtinProvider,
        persistedProvider,
        mcpProvider,
        composioProvider,
      });
    };

    return {
      getRegistry,
      getToolTypeInfo: () => getToolTypeInfo(toolTypes),
    };
  }
}

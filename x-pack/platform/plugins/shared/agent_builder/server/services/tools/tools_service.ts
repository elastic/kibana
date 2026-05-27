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
import type { Runner, InternalToolDefinition } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { isAllowedBuiltinTool } from '@kbn/agent-builder-server/allow_lists';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { createBadRequestError, type ToolType } from '@kbn/agent-builder-common';
import { getCurrentSpaceId } from '../../utils/spaces';
import {
  createBuiltinToolRegistry,
  createBuiltinProviderFn,
  type BuiltinToolRegistry,
} from './builtin';
import type { ExecuteDraftParams, ToolsServiceSetup, ToolsServiceStart } from './types';
import { getToolTypeDefinitions } from './tool_types';
import { isEnabledDefinition } from './tool_types/definitions';
import { createPersistedProviderFn } from './persisted';
import { createToolRegistry } from './tool_registry';
import { createToolHealthClient } from './health';
import type { AgentBuilderConfig } from '../../config';

export interface ToolsServiceSetupDeps {
  logger: Logger;
  workflowsManagement?: WorkflowsServerPluginSetup;
  config: AgentBuilderConfig;
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
    const { logger, workflowsManagement, config } = this.setupDeps!;

    const toolTypes = getToolTypeDefinitions({
      workflowsManagement,
      actions,
      indexSearchDeps: {
        uiSettings,
        savedObjects,
        topSnippetsDefaults: config.topSnippets,
      },
    });

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
      const soClient = savedObjects.getScopedClient(request);
      const experimentalFeaturesEnabled = await uiSettings
        .asScopedToClient(soClient)
        .get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);

      return createToolRegistry({
        getRunner,
        space,
        request,
        builtinProvider,
        persistedProvider,
        uiSettings,
        savedObjects,
        healthClient,
        logger,
        healthTrackedToolTypes,
        experimentalFeaturesEnabled,
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

    const executeDraft: ToolsServiceStart['executeDraft'] = async ({
      request,
      type,
      configuration,
      toolParams,
      connectorId,
    }: ExecuteDraftParams) => {
      const typeDef = toolTypes.find(
        (def): def is Extract<typeof def, { toolType: ToolType }> & { validateForCreate: any } =>
          'toolType' in def && def.toolType === type && isEnabledDefinition(def)
      );
      if (!typeDef || !isEnabledDefinition(typeDef)) {
        throw createBadRequestError(
          `Unknown or unsupported tool type for chat authoring: ${String(type)}`
        );
      }

      const spaceId = getCurrentSpaceId({ request, spaces });
      const esClient = elasticsearch.client.asScoped(request).asCurrentUser;
      const validatorContext = { request, spaceId, esClient };

      const validatedConfig = await typeDef.validateForCreate({
        config: configuration as Record<string, any>,
        context: validatorContext,
      });

      const dynamic = await typeDef.getDynamicProps(validatedConfig as Record<string, any>, {
        request,
        spaceId,
      });
      const toolSchema = await dynamic.getSchema();
      const validation = toolSchema.safeParse(toolParams);
      if (!validation.success) {
        throw createBadRequestError(`Invalid parameters: ${validation.error.message}`);
      }

      const transientTool: InternalToolDefinition = {
        id: '__draft__',
        type,
        description: 'Draft tool execution',
        readonly: true,
        tags: [],
        experimental: false,
        configuration: validatedConfig as Record<string, unknown>,
        isAvailable: async () => ({ status: 'available' }),
        getSchema: () => toolSchema,
        getHandler: async () => dynamic.getHandler(),
        ...(dynamic.getLlmDescription ? { getLlmDescription: dynamic.getLlmDescription } : {}),
      };

      return getRunner().runInternalTool({
        tool: transientTool,
        toolParams: validation.data as Record<string, unknown>,
        request,
        source: 'user',
        ...(connectorId ? { defaultConnectorId: connectorId } : {}),
      });
    };

    return {
      getRegistry,
      getToolDefinitions: () => toolTypes,
      getHealthClient,
      executeDraft,
    };
  }
}

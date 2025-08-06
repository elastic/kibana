/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  ElasticsearchClient,
  ElasticsearchServiceStart,
} from '@kbn/core-elasticsearch-server';
import {
  createBadRequestError,
  ConnectorToolConfig,
  isToolNotFoundError,
  ToolType,
} from '@kbn/onechat-common';
import { ActionsClient } from '@kbn/actions-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { ToolTypeClient, ToolTypeDefinition } from '../tool_provider';
import type { ToolPersistedDefinition } from '../client';
import { createClient } from '../client';
import { toToolDefinition } from './utils/to_tool_definition';

import { createOneChatCompatibleConnectorRegistry } from './utils/schema_registry';

const schemaRegistry = createOneChatCompatibleConnectorRegistry();

export const createConnectorToolTypeDefinition = ({
  logger,
  elasticsearch,
  actions,
}: {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  actions: ActionsPluginStart;
}): ToolTypeDefinition<ToolType.connector, ConnectorToolConfig> => {
  return {
    toolType: ToolType.connector,
    readonly: false,
    getClient: async ({ request }) => {
      const esClient = elasticsearch.client.asScoped(request).asInternalUser;
      const actionsClient = await actions.getActionsClientWithRequest(request);
      return createConnectorToolClient({ logger, esClient, actions: actionsClient });
    },
  };
};

export const createConnectorToolClient = ({
  logger,
  esClient,
  actions,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
  actions: ActionsClient;
}): ToolTypeClient<ConnectorToolConfig> => {
  const toolClient = createClient({ esClient, logger });

  return {
    async has(toolId: string) {
      try {
        const tool = await toolClient.get(toolId);
        if (tool.type !== ToolType.connector) {
          return false;
        }
        return true;
      } catch (e) {
        if (isToolNotFoundError(e)) {
          return false;
        }
        throw e;
      }
    },

    async get(toolId) {
      const tool = await toolClient.get(toolId);
      const typedTool = tool as ToolPersistedDefinition<ConnectorToolConfig>;

      const connector = await actions.get({ id: typedTool.configuration.connector_id });

      const subactionSchema = schemaRegistry.getSubactionSchema({
        connectorType: connector.actionTypeId,
        subaction: typedTool.configuration.sub_action,
      });

      return toToolDefinition(typedTool, subactionSchema);
    },

    async list() {
      const tools = await toolClient.list();
      return await Promise.all(
        tools
          .filter((tool) => tool.type === ToolType.connector)
          .map(async (tool) => {
            const typedTool = tool as ToolPersistedDefinition<ConnectorToolConfig>;
            const connector = await actions.get({ id: typedTool.configuration.connector_id });

            const subactionSchema = schemaRegistry.getSubactionSchema({
              connectorType: connector.actionTypeId,
              subaction: typedTool.configuration.sub_action,
            });
            return toToolDefinition(typedTool, subactionSchema);
          })
      );
    },

    async create(createRequest) {
      try {
        // TODO: validate against real schema - should be just connector_id
        // configurationSchema.validate(createRequest.configuration);
      } catch (e) {
        throw createBadRequestError(`Invalid configuration for connector tool: ${e.message}`);
      }

      const connector = await actions.get({ id: createRequest.configuration.connector_id });

      const subactionSchema = schemaRegistry.getSubactionSchema({
        connectorType: connector.actionTypeId,
        subaction: createRequest.configuration.sub_action,
      });

      const tool = await toolClient.create({
        ...createRequest,
        type: ToolType.connector,
      });

      return toToolDefinition(
        tool as ToolPersistedDefinition<ConnectorToolConfig>,
        subactionSchema
      );
    },

    async update(toolId, updateRequest) {
      throw createBadRequestError(`This method is just not working, sorry`);
    },

    async delete(toolId: string) {
      return toolClient.delete(toolId);
    },
  };
};

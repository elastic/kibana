/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBadRequestError, isToolNotFoundError, ToolType } from '@kbn/onechat-common';
import type { Logger } from '@kbn/logging';
import type {
  ElasticsearchClient,
  ElasticsearchServiceStart,
} from '@kbn/core-elasticsearch-server';
import type { ToolTypeClient, ToolSource } from '../tool_provider';
import type { ToolPersistedDefinition } from './client';
import { createClient } from './client';
import { createEsqlToolType } from './tool_types/esql';
import type { PersistedToolTypeDefinition } from './tool_types/types';

export const createPersistedToolSource = ({
  logger,
  elasticsearch,
}: {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
}): ToolSource<ToolType.esql | ToolType.index_search> => {
  const toolDefinitions: PersistedToolTypeDefinition[] = [createEsqlToolType()];

  return {
    id: 'persisted',
    toolTypes: [ToolType.esql, ToolType.index_search],
    readonly: false,
    getClient: ({ request }) => {
      const esClient = elasticsearch.client.asInternalUser;
      return createPersistedToolClient({
        definitions: toolDefinitions,
        logger,
        esClient,
      });
    },
  };
};

// persistence client

export const createPersistedToolClient = ({
  definitions,
  logger,
  esClient,
}: {
  definitions: PersistedToolTypeDefinition[];
  logger: Logger;
  esClient: ElasticsearchClient;
}): ToolTypeClient<any> => {
  const toolClient = createClient({ esClient, logger });
  const definitionMap = definitions.reduce((map, def) => {
    map[def.toolType] = def;
    return map;
  }, {} as Record<ToolType, PersistedToolTypeDefinition>);

  return {
    async has(toolId: string) {
      try {
        await toolClient.get(toolId);
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
      const definition = definitionMap[tool.type];
      if (!definition) {
        throw createBadRequestError(`Unknown type for tool '${toolId}': '${tool.type}'`);
      }
      return definition.toToolDefinition(tool as ToolPersistedDefinition<any>);
    },

    async list() {
      const tools = await toolClient.list();
      return tools.map((tool) => {
        const definition = definitionMap[tool.type];
        return definition.toToolDefinition(tool as ToolPersistedDefinition<any>);
      });
    },

    async create(createRequest) {
      const definition = definitionMap[createRequest.type];
      if (!definition) {
        throw createBadRequestError(`Unknown tool type: '${createRequest.type}'`);
      }

      try {
        definition.createSchema.validate(createRequest.configuration);
      } catch (e) {
        throw createBadRequestError(
          `Invalid configuration for tool type ${createRequest.type}: ${e.message}`
        );
      }

      let updatedConfig: Record<string, unknown>;
      try {
        updatedConfig = definition.validateForCreate(createRequest.configuration);
      } catch (e) {
        throw createBadRequestError(
          `Invalid configuration for tool type ${createRequest.type}: ${e.message}`
        );
      }

      const mergedRequest = {
        ...createRequest,
        configuration: updatedConfig,
      };

      const tool = await toolClient.create(mergedRequest);

      return definition.toToolDefinition(tool as ToolPersistedDefinition<any>);
    },

    async update(toolId, updateRequest) {
      const existingTool = await this.get(toolId);
      const definition = definitionMap[existingTool.type];
      if (!definition) {
        throw createBadRequestError(`Unknown tool type: '${existingTool.type}'`);
      }

      try {
        definition.updateSchema.validate(updateRequest.configuration);
      } catch (e) {
        throw createBadRequestError(
          `Invalid configuration for tool type ${existingTool.type}: ${e.message}`
        );
      }

      let updatedConfig: Record<string, unknown>;
      try {
        updatedConfig = definition.validateForUpdate(
          updateRequest.configuration ?? {},
          existingTool.configuration
        );
      } catch (e) {
        throw createBadRequestError(
          `Invalid configuration for tool type ${existingTool.type}: ${e.message}`
        );
      }

      const mergedConfig = {
        ...updateRequest,
        configuration: updatedConfig,
      };
      const tool = await toolClient.update(toolId, mergedConfig);
      return definition.toToolDefinition(tool as ToolPersistedDefinition<any>);
    },

    async delete(toolId: string) {
      return toolClient.delete(toolId);
    },
  };
};

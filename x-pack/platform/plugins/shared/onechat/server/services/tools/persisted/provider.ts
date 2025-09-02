/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolType } from '@kbn/onechat-common';
import { createBadRequestError, isToolNotFoundError } from '@kbn/onechat-common';
import type { Logger } from '@kbn/logging';
import type {
  ElasticsearchClient,
  ElasticsearchServiceStart,
} from '@kbn/core-elasticsearch-server';
import type { ToolTypeClient, ToolSource } from '../tool_provider';
import type { ToolPersistedDefinition } from './client';
import { createClient } from './client';
import { createEsqlToolType, createIndexSearchToolType } from './tool_types';
import type { PersistedToolTypeDefinition, ToolTypeValidatorContext } from './tool_types/types';

export const createPersistedToolSource = ({
  logger,
  elasticsearch,
}: {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
}): ToolSource => {
  const toolDefinitions: PersistedToolTypeDefinition<any>[] = [
    createEsqlToolType(),
    createIndexSearchToolType(),
  ];
  const toolTypes = toolDefinitions.map((def) => def.toolType);

  return {
    id: 'persisted',
    toolTypes,
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

  const createContext = (): ToolTypeValidatorContext => {
    return {
      esClient,
    };
  };

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
        if (!definition) {
          throw createBadRequestError(`Unknown tool type: '${tool.type}'`);
        }
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
        updatedConfig = await definition.validateForCreate(
          createRequest.configuration,
          createContext()
        );
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
        updatedConfig = await definition.validateForUpdate(
          updateRequest.configuration ?? {},
          existingTool.configuration,
          createContext()
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

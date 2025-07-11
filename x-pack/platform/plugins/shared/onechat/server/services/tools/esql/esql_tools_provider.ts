/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  ElasticsearchServiceStart,
  ElasticsearchClient,
} from '@kbn/core-elasticsearch-server';
import {
  isToolNotFoundError,
  createBadRequestError,
  ToolType,
  EsqlToolConfig,
} from '@kbn/onechat-common';
import { ToolTypeClient, ToolTypeDefinition } from '../tool_provider';
import { createClient } from '../client';
import type { ToolPersistedDefinition } from '../client';
import { toToolDefinition } from './utils/to_tool_definition';
import { configurationSchema, configurationUpdateSchema } from './schemas';

export const createEsqlToolTypeDefinition = ({
  logger,
  elasticsearch,
}: {
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
}): ToolTypeDefinition<ToolType.esql, EsqlToolConfig> => {
  return {
    toolType: ToolType.esql,
    readonly: false,
    getClient: ({ request }) => {
      const esClient = elasticsearch.client.asScoped(request).asInternalUser;
      return createEsqlToolClient({ logger, esClient });
    },
  };
};

export const createEsqlToolClient = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): ToolTypeClient<EsqlToolConfig> => {
  const toolClient = createClient({ esClient, logger });

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
      return toToolDefinition(tool as ToolPersistedDefinition<EsqlToolConfig>);
    },

    async list() {
      const tools = await toolClient.list();
      return tools.map((tool) => toToolDefinition(tool as ToolPersistedDefinition<EsqlToolConfig>));
    },

    async create(createRequest) {
      try {
        configurationSchema.validate(createRequest.configuration);
      } catch (e) {
        throw createBadRequestError(`Invalid configuration for esql tool: ${e.message}`);
      }
      const tool = await toolClient.create(createRequest);
      return toToolDefinition(tool as ToolPersistedDefinition<EsqlToolConfig>);
    },

    async update(toolId, updateRequest) {
      try {
        configurationUpdateSchema.validate(updateRequest.configuration);
      } catch (e) {
        throw createBadRequestError(`Invalid configuration for esql tool: ${e.message}`);
      }
      const tool = await toolClient.update(toolId, updateRequest);
      return toToolDefinition(tool as ToolPersistedDefinition<EsqlToolConfig>);
    },

    async delete(toolId: string) {
      return toolClient.delete(toolId);
    },
  };
};

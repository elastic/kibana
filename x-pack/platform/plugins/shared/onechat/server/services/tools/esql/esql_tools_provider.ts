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
import { KibanaRequest } from '@kbn/core-http-server';
import {
  createToolNotFoundError,
  isToolNotFoundError,
  type FieldTypes,
  ToolType,
  ToolDescriptor,
} from '@kbn/onechat-common';
import { ToolTypeClient, ToolTypeDefinition } from '../tool_provider';
import { createClient } from '../client';

// TODO: move to common
interface EsqlToolConfig {
  query: string;
  params: Record<
    string,
    {
      /**
       * The data types of the parameter. Must be one of these
       */
      type: FieldTypes;
      /**
       * Description of the parameter's purpose or expected values.
       */
      description: string;
    }
  >;
}

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
      return tool as ToolDescriptor<EsqlToolConfig>;
    },
    async list() {
      const tools = await toolClient.list();
      return tools as Array<ToolDescriptor<EsqlToolConfig>>;
    },
    async create(createRequest) {
      // TODO: params validation
      // TODO: convert tool (add schema)
      return toolClient.create(createRequest);
    },
    async update(toolId, updateRequest) {
      // TODO: params validation
      // TODO: convert tool (add schema)
      return toolClient.update(toolId, updateRequest);
    },
    async delete(toolId: string) {
      return toolClient.delete(toolId);
    },
  };
};

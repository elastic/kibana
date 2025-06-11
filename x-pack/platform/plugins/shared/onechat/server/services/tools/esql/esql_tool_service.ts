/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
    KibanaRequest,
    Logger,
    ElasticsearchServiceStart,
  } from '@kbn/core/server';
  import { EsqlToolClient, createClient } from './client';
  import { createStorage } from './storage';
import { RegisteredToolProviderWithId } from '../types';
import { z } from 'zod';
import { EsqlTool, RegisteredTool } from '@kbn/onechat-server';
import { esqlToolProviderId } from '@kbn/onechat-common';
import { EsqlToolCreateRequest } from '@kbn/onechat-plugin/common/tools';
  
export interface EsqlToolService extends RegisteredToolProviderWithId {
  getScopedClient(options: { request: KibanaRequest }): Promise<EsqlToolClient>;
}

export const esqlSchema = z.object({
  id: z.string().describe('Esql tool ID'),
  params: z.record(z.any()).optional().describe('parameters to pass to the ESQL query'),
});

export class EsqlToolServiceImpl implements EsqlToolService {
  public readonly id = esqlToolProviderId;
  private readonly logger: Logger;
  private readonly elasticsearch: ElasticsearchServiceStart;

  constructor({
    logger,
    elasticsearch
  }: {
    logger: Logger;
    elasticsearch: ElasticsearchServiceStart;
  }) {
    this.logger = logger;
    this.elasticsearch = elasticsearch;
  }

  async has(options: { toolId: string; request: KibanaRequest }): Promise<boolean> {
    const { toolId, request } = options;
    try {
      await this.get({ toolId, request });
      return true;
    } catch (error) {
      return false;
    }
  }

  async get(options: { toolId: string; request: KibanaRequest }): Promise<RegisteredTool> {
    const { toolId, request } = options;
    const client = await this.getScopedClient({ request });
      try {
          const document = await client.get(toolId);
          const tool = document;
          const executableTool = this.esqlToolCreater(tool);

          return executableTool as EsqlTool;
          
      } catch (error) {
          if (error.statusCode === 404) {
              throw new Error(`Tool with ID ${toolId} not found`);
          }
          this.logger.error(`Error retrieving ESQL tool with ID ${toolId}: ${error}`);
          throw error;
      }
  }

  async list(options: { request: KibanaRequest }): Promise<RegisteredTool[]> {
    const client = await this.getScopedClient({ request: options.request });
    const esqlTools = await client.list();
    return esqlTools
  }

  getScopedUsers({ request }: { request: KibanaRequest }) {
    return {
      internalUser: this.elasticsearch.client.asScoped(request).asInternalUser,
      currentUser: this.elasticsearch.client.asScoped(request).asCurrentUser,
    }
  }
  async getScopedClient({ request }: { request: KibanaRequest }): Promise<EsqlToolClient> {
    try {
      const { internalUser, currentUser } = this.getScopedUsers({ request });
      const storage = createStorage({ 
          logger: this.logger, 
          esClient: internalUser,
      });

      const client = createClient({ 
          storage, 
          esClient: currentUser,
      });

      return client;
  } catch (error) {
      this.logger.error(error);
      throw error;
      }
  }
  esqlToolCreater = (tool: EsqlToolCreateRequest): EsqlTool => {
    this.logger.info(`Creating ESQL tool: ${tool.id}`);
    return {
      id: tool.id,
      description: tool.description,
      query: tool.query,
      params: tool.params,
      schema: esqlSchema,
      handler: async ({ id, params }) => {
        return "For some reason the schema isn't working :( ";
      },
      meta: tool.meta
    };
    
  };

}

      
    
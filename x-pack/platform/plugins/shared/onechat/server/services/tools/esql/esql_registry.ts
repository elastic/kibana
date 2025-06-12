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
import { EsqlTool, RegisteredTool } from '@kbn/onechat-server';
import { esqlToolProviderId } from '@kbn/onechat-common';
import { esqlToolCreater } from './utils/execute_esql_query';
  
export interface EsqlToolRegistry extends RegisteredToolProviderWithId {
  getScopedClient(options: { request: KibanaRequest }): Promise<EsqlToolClient>;
}

export class EsqlToolRegistryImpl implements EsqlToolRegistry {
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
          const executableTool = esqlToolCreater(tool);

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
    const registeredTools: RegisteredTool[] = [];

    for (const tool of esqlTools) {
      const executableTool = esqlToolCreater(tool);
      registeredTools.push(executableTool);
    }
    return registeredTools
  }

  async getScopedClient({ request }: { request: KibanaRequest }): Promise<EsqlToolClient> {
    try {
      const storage = createStorage({ 
          logger: this.logger, 
          esClient: this.elasticsearch.client.asScoped(request).asInternalUser,
      });

      const client = createClient({ 
          storage
      });

      return client;
  } catch (error) {
      this.logger.error(error);
      throw error;
      }
  }

}

      
    
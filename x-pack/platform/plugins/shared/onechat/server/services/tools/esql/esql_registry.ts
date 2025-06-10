/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { EsqlToolStorage } from './storage';
import {
    esqlToolProviderId,
    PlainIdToolIdentifier,
    type EsqlTool,
  } from '@kbn/onechat-common';
import { EsqlToolCreateRequest } from '@kbn/onechat-plugin/common/tools';
import { logger } from 'elastic-apm-node';
import { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { esqlToolIndexName } from './storage';
import { RegisteredTool, RegisteredToolProvider } from '@kbn/onechat-server';
import { RegisteredToolProviderWithId } from '../types';
import { UnknownKeysParam, z, ZodObject, ZodTypeAny } from 'zod';
import { schema } from '@kbn/config-schema';

export interface EsqlToolRegistry extends RegisteredToolProviderWithId {
    register(esqlTool: EsqlToolCreateRequest): void;
    execute(name: string, params: Record<string, any>): Promise<any>;
  }

export const createEsqlToolRegistry = ({
    storage,
    esClient,
  }: {
    storage: EsqlToolStorage;
    esClient: ElasticsearchClient;
  }): EsqlToolRegistry => {
    return new EsqlToolRegistryImpl({ storage, esClient });
  };


  class EsqlToolRegistryImpl {
    public readonly id = esqlToolProviderId;
    private readonly storage: EsqlToolStorage;
    private readonly esClient: ElasticsearchClient;

    constructor({ storage, esClient }: { storage: EsqlToolStorage; esClient: ElasticsearchClient; }) {
        this.storage = storage;
        this.esClient = esClient;
    }

    async has(options: { toolId: string; request: KibanaRequest }): Promise<boolean> {
        const { toolId } = options;
        
        try {
          await this.get({ toolId, request: options.request });
          return true;
        } catch (error) {
          if (error.message?.includes('not found') || error.statusCode === 404) {
            return false;
          }
          console.error(`Error checking if ESQL tool ${toolId} exists:`, error);
          return false;
        }
      }

      async get(options: { 
        toolId: string; 
        request: KibanaRequest<unknown, unknown, unknown, any>; 
      }): Promise<RegisteredTool> {
        const { toolId } = options;
        
        try {
          const document = await this.storage.getClient().get({ id: toolId });
          const tool = document._source as EsqlTool;
          
          return {
            id: tool.id,
            description: tool.description,
            meta: {
              providerId: tool.meta.providerId,
              tags: tool.meta?.tags || [],
            },
            schema: z.object({
              query: z.string().describe('ESQL query to execute').default(tool.query),
            }),
            handler: async (params) => {
              return this.execute(tool.id, params);
            }
          };
        } catch (error) {
          if (error.statusCode === 404) {
            throw new Error(`Tool with ID ${toolId} not found`);
          }
          logger.error(`Error retrieving ESQL tool with ID ${toolId}: ${error}`);
          throw error;
        }
      }

    async list(options: { request: KibanaRequest }): Promise<EsqlTool[]> {
        try {
            const document = await this.storage.getClient().search({
                index: esqlToolIndexName,
                query: {
                    match_all: {}
                },
                size: 1000, 
                track_total_hits: true
            });

            return document.hits.hits.map(hit => hit._source as EsqlTool);
        } catch (error) {
            logger.error(`Error fetching all ESQL tools: ${error}`);
            return [];
        }
    }

    async register(tool: EsqlToolCreateRequest): Promise<void> {
        try {
            const now = new Date();
            const id = tool.id ?? uuidv4();
        
            const attributes = {
                id,
                description: tool.description,
                query: tool.query,
                params: tool.params,
                meta: {
                    providerId: tool.meta.providerId,
                    tags: tool.meta?.tags || [],
                },
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                
            };
        
            await this.storage.getClient().index({
                id,
                document: attributes,
            });
        
        } catch (error: any) {
            logger.info(error);
            throw error; 
        }
    }

    async execute(id: string, params: Record<string, any>): Promise<any> {
        try {
            const document = await this.storage.getClient().search({
                index: esqlToolIndexName,
                query: {
                    term: {
                        id: id
                    }
                },
                size: 1,
                track_total_hits: true  
            });
            const tool = document.hits.hits[0]._source  

            if (!tool) {
                throw new Error(`ESQL tool not found: ${id}`);
            }

            const filledQuery = tool.query.replace(/\?(\w+)/g, (_, key) => {
                if (!(key in tool.params)) { 
                    throw new Error(`Parameter ${key} not found in tool params`);
                }
                
                const value = params[key];
                if (value === undefined || value === null) {
                    throw new Error(`Parameter ${key} is required but was not provided`);
                }
                
                return typeof value === 'string' ? `"${value}"` : value;
            });

            const esqlResponse = await this.esClient.transport.request({
                method: 'POST',
                path: '/_query',
                body: {
                  query: filledQuery
                }
              });
    
            return esqlResponse;
        } catch (error) {
            logger.error(`Error executing ESQL tool with name ${name}: ${error}`);
            throw error;
        }
        
      }
  }
    
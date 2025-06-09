/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { EsqlToolStorage } from './storage';
import {
    type EsqlTool,
  } from '@kbn/onechat-common';
import { EsqlToolCreateRequest } from '@kbn/onechat-plugin/common/tools';
import { logger } from 'elastic-apm-node';
import { ElasticsearchClient } from '@kbn/core/server';
import { esqlToolIndexName } from './storage';

export interface EsqlToolClient {
    get(esqlToolId: string): Promise<EsqlTool>;
    list(): Promise<EsqlTool[]>;
    create(esqlTool: EsqlToolCreateRequest): Promise<EsqlTool>;
    execute(name: string, params: Record<string, any>): Promise<any>;
  }

export const createClient = ({
    storage,
    esClient,
  }: {
    storage: EsqlToolStorage;
    esClient: ElasticsearchClient;
  }): EsqlToolClient => {
    return new EsqlToolClientImpl({ storage, esClient });
  };

  class EsqlToolClientImpl {
    private readonly storage: EsqlToolStorage;
    private readonly esClient: ElasticsearchClient;

    constructor({ storage, esClient }: { storage: EsqlToolStorage; esClient: ElasticsearchClient; }) {
        this.storage = storage;
        this.esClient = esClient;
    }

    async get(esqlToolId: string): Promise<EsqlTool> {
        try {
            const document = await this.storage.getClient().get({ id: esqlToolId });
            return document._source as EsqlTool;
        } catch (error) {
            if (error.statusCode === 404) {
                throw new Error(`Tool with ID ${esqlToolId} not found`);
            }
            logger.error(`Error retrieving ESQL tool with ID ${esqlToolId}: ${error}`);
            throw error;
        }
        
      }

    async list(): Promise<EsqlTool[]> {
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

    async create(tool: EsqlToolCreateRequest): Promise<EsqlTool> {
        try {
            const now = new Date();
            const id = tool.id ?? uuidv4();
        
            const attributes = {
                id,
                name: tool.name,
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

            return this.get(id);
        
        } catch (error: any) {
            logger.info(error);
            throw error; 
        }
    }

    async execute(name: string, params: Record<string, any>): Promise<any> {
        try {
            const document = await this.storage.getClient().search({
                index: esqlToolIndexName,
                query: {
                    term: {
                        name: name
                    }
                },
                size: 1,
                track_total_hits: true  
            });
            const tool = document.hits.hits[0]._source  

            if (!tool) {
                throw new Error(`ESQL tool not found: ${name}`);
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
    
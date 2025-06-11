/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlToolStorage } from './storage';
import {
    esqlToolProviderId,
  } from '@kbn/onechat-common';
import { logger } from 'elastic-apm-node';
import { ElasticsearchClient } from '@kbn/core/server';
import { esqlToolIndexName } from './storage';
import { EsqlTool } from '@kbn/onechat-server';
import { EsqlToolCreateRequest } from '@kbn/onechat-plugin/common/tools';

export interface EsqlToolClient{
    get(toolId: string): Promise<EsqlToolCreateRequest>;
    list(): Promise<EsqlTool[]>;
    create(esqlTool: EsqlToolCreateRequest): Promise<EsqlToolCreateRequest>;
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
    public readonly id = esqlToolProviderId;
    private readonly storage: EsqlToolStorage;
    private readonly esClient: ElasticsearchClient;

    constructor({ storage, esClient }: { storage: EsqlToolStorage; esClient: ElasticsearchClient; }) {
        this.storage = storage;
        this.esClient = esClient;
    }

    async get( id: string ): Promise<EsqlToolCreateRequest> {
        try {
            const document = await this.storage.getClient().get({ id: id });
            const tool = document._source as EsqlTool;
            return tool
            
        } catch (error) {
            if (error.statusCode === 404) {
                throw new Error(`Tool with ID ${id} not found`);
            }
            logger.error(`Error retrieving ESQL tool with ID ${id}: ${error}`);
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

    async create(tool: EsqlToolCreateRequest): Promise<EsqlToolCreateRequest> {
        try {
            const now = new Date();
            if (!tool.id){
                throw new Error('Tool ID is required');
            }

            const document = {
                id: tool.id,
                description: tool.description,
                query: tool.query,
                params: tool.params,
                meta: {
                    providerId: esqlToolProviderId,
                    tags: [],
                },
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
            };

            await this.storage.getClient().index({
                id: tool.id,
                document: document,
            });

            return this.get(tool.id);

        } catch (error: any) {
            logger.info(error);
            throw error; 
        }
    }

    async execute(id: string, params: Record<string, any>): Promise<any> {
        try {
            logger.info(`Executing ESQL tool with ID: ${id} and params: ${JSON.stringify(params)}`);
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
            logger.info(`ESQL tool search result: ${JSON.stringify(document)}`);

            if (document.hits.total.value === 0) {
                throw new Error(`ESQL tool not found: ${id}`);
            }
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
            logger.error(`Error executing ESQL tool with name ${id}: ${error}`);
            throw error;
        }
      }

      
  }
    
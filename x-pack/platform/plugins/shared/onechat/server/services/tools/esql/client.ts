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

export interface EsqlToolClient {
    get(esqlToolId: string): Promise<EsqlTool>;
    create(esqlTool: EsqlToolCreateRequest): Promise<EsqlTool>;
    execute(esqlToolId: string): Promise<any>;
  }

export const createClient = ({
    storage,
    esClient,
  }: {
    storage: EsqlToolStorage;
    esClient: ElasticsearchClient
  }): EsqlToolClient => {
    return new EsqlToolClientImpl({ storage, esClient });
  };

  class EsqlToolClientImpl {
    private readonly storage: EsqlToolStorage;
    private readonly esClient: ElasticsearchClient;

    constructor({ storage, esClient }: { storage: EsqlToolStorage; esClient: ElasticsearchClient }) {
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

    async create(tool: EsqlToolCreateRequest): Promise<EsqlTool> {
        try {
            const now = new Date();
            const id = tool.id ?? uuidv4();
        
            const attributes = {
                id,
                name: tool.name,
                description: tool.description,
                query: tool.query,
                params: tool.params.map(param => ({
                    key: param.key,
                    value: {
                        type: param.value.type,
                        description: param.value.description,
                    }
                })),
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
            };
        
            await this.storage.getClient().index({
                id,
                document: attributes,
            });
        
            return this.get(id);
        
        } catch (error: any) {
            logger.info('Error creating ESQL tool:' + error);
            throw error; 
        }
    }

    async execute(esqlToolId: string): Promise<any> {
        try {
            const document = await this.storage.getClient().get({ id: esqlToolId });
            const tool = document._source

            if (!tool) {
                throw new Error(`ESQL tool not found: ${esqlToolId}`);
            }

            logger.info("Tool found: " + JSON.stringify(tool));

            const esqlResponse = await this.esClient.transport.request({
                method: 'POST',
                path: '/_query',
                body: {
                  query: tool.query
                }
              });
          
            logger.info("ESQL Response: " + JSON.stringify(esqlResponse));
            return esqlResponse;
        } catch (error) {
            if (error.statusCode === 404) {
                throw new Error(`Tool with ID ${esqlToolId} not found`);
            }
            logger.error(`Error retrieving ESQL tool with ID ${esqlToolId}: ${error}`);
            throw error;
        }
        
      }
  }
    
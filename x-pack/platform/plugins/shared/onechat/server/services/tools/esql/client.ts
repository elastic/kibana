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
import { esqlToolIndexName } from './storage';
import { EsqlToolCreateRequest } from '@kbn/onechat-plugin/common/tools';

export interface EsqlToolClient{
    get(toolId: string): Promise<EsqlToolCreateRequest>;
    list(): Promise<EsqlToolCreateRequest[]>;
    create(esqlTool: EsqlToolCreateRequest): void;
    update(toolId: string, updates: Partial<EsqlToolCreateRequest>): Promise<EsqlToolCreateRequest>;
  }

export const createClient = ({
    storage
  }: {
    storage: EsqlToolStorage;
  }): EsqlToolClient => {
    return new EsqlToolClientImpl({ storage });
  };

  class EsqlToolClientImpl {
    public readonly id = esqlToolProviderId;
    private readonly storage: EsqlToolStorage;

    constructor({ storage }: { storage: EsqlToolStorage }) {
        this.storage = storage;
    }

    async get( id: string ): Promise<EsqlToolCreateRequest> {
        try {
            const document = await this.storage.getClient().get({ id: id });
            const tool = document._source as EsqlToolCreateRequest;

            return tool
            
        } catch (error) {
            logger.error(`Error retrieving ESQL tool with ID ${id}: ${error}`);
            throw error;
        }
      }

    async list(): Promise<EsqlToolCreateRequest[]> {
        try {
            const document = await this.storage.getClient().search({
                index: esqlToolIndexName,
                query: {
                    match_all: {}
                },
                size: 1000, 
                track_total_hits: true
            });

            return document.hits.hits.map(hit => hit._source as EsqlToolCreateRequest);
        } catch (error) {
            logger.error(`Error fetching all ESQL tools: ${error}`);
            throw error;
        }
    }

    async create(tool: EsqlToolCreateRequest) {
        try {
            if (!tool.id){
                throw new Error('Tool ID is required');
            }

            const document = {
                ...tool,
                meta: {
                    providerId: esqlToolProviderId,
                    tags: [],
                }
            };

            await this.storage.getClient().index({
                id: tool.id,
                document: document,
            });

        } catch (error) {
            logger.info(`Error creating ESQL tool with ID ${tool.id}: ${error}`);
            throw error; 
        }
    }
    async update(id: string, updates: Partial<EsqlToolCreateRequest>): Promise<EsqlToolCreateRequest> {
        try {
            const now = new Date();
            const document = await this.storage.getClient().get({ id: id });
            const tool = document._source as EsqlToolCreateRequest;
            
            const updatedTool = {
                id: updates.id ?? tool.id,
                description: updates.description ?? tool.description,
                query: updates.query ?? tool.query,
                params: updates.params ?? tool.params,
                meta: {
                    providerId: esqlToolProviderId,
                    tags: tool.meta?.tags ?? updates.meta?.tags ?? [],
                },
                created_at: tool.created_at,
                updated_at: now.toISOString(),
            };
            
            await this.storage.getClient().index({
                id: id,
                document: updatedTool
            });
            return updatedTool;
        } catch (error) {
            logger.error(`Error updating ESQL tool with ID ${id}: ${error}`);
            throw error;
        }
     }
  }
    
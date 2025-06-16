/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlToolProviderId } from '@kbn/onechat-common';
import { logger } from 'elastic-apm-node';
import { EsqlToolCreateRequest, EsqlToolCreateResponse } from '../../../../common/tools';
import { esqlToolIndexName } from './storage';
import { EsqlToolStorage } from './storage';

export interface EsqlToolClient {
  get(toolId: string): Promise<EsqlToolCreateResponse>;
  list(): Promise<EsqlToolCreateResponse[]>;
  create(esqlTool: EsqlToolCreateResponse): Promise<EsqlToolCreateResponse>;
  update(toolId: string, updates: Partial<EsqlToolCreateRequest>): Promise<EsqlToolCreateResponse>;
  delete(toolId: string): Promise<boolean>;
}

export const createClient = ({ storage }: { storage: EsqlToolStorage }): EsqlToolClient => {
  return new EsqlToolClientImpl({ storage });
};

class EsqlToolClientImpl {
  public readonly id = esqlToolProviderId;
  private readonly storage: EsqlToolStorage;

  constructor({ storage }: { storage: EsqlToolStorage }) {
    this.storage = storage;
  }

  async get(id: string): Promise<EsqlToolCreateResponse> {
    try {
      const document = await this.storage.getClient().get({ id });
      const tool = document._source as EsqlToolCreateResponse;

      return tool;
    } catch (error) {
      logger.error(`Error retrieving ESQL tool with ID ${id}: ${error}`);
      throw error;
    }
  }

  async list(): Promise<EsqlToolCreateResponse[]> {
    try {
      const document = await this.storage.getClient().search({
        index: esqlToolIndexName,
        query: {
          match_all: {},
        },
        size: 1000,
        track_total_hits: true,
      });

      return document.hits.hits.map((hit) => hit._source as EsqlToolCreateResponse);
    } catch (error) {
      logger.error(`Error fetching all ESQL tools: ${error}`);
      throw error;
    }
  }

  async create(tool: EsqlToolCreateRequest) {
    try {
      if (!tool.id) {
        throw new Error('Tool ID is required');
      }

      const document = {
        ...tool,
        meta: {
          providerId: esqlToolProviderId,
          tags: [],
        },
      };

     await this.storage.getClient().index({
        id: tool.id,
        document,
      });

    return document as EsqlToolCreateResponse;
    } catch (error) {
      logger.info(`Error creating ESQL tool with ID ${tool.id}: ${error}`);
      throw error;
    }
  }
  async update(
    id: string,
    updates: Partial<EsqlToolCreateRequest>
  ): Promise<EsqlToolCreateResponse> {
    try {
      const now = new Date();
      const document = await this.storage.getClient().get({ id });
      const tool = document._source as EsqlToolCreateResponse;

      const updatedTool = {
        id: updates.id ?? tool.id,
        name: updates.name ?? tool.name,
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
        id,
        document: updatedTool,
      });
      return updatedTool;
    } catch (error) {
      logger.error(`Error updating ESQL tool with ID ${id}: ${error}`);
      throw error;
    }
  }
  async delete(id: string): Promise<boolean> {
    try {
      const document = await this.storage.getClient().get({ id });

      if (!document._source) {
        throw new Error(`Tool with ID ${id} not found`);
      }

      await this.storage.getClient().delete({ id });
    } catch (error) {
      logger.error(`Error deleting ESQL tool with ID ${id}: ${error}`);
      throw error;
    }
    return true;
  }
}

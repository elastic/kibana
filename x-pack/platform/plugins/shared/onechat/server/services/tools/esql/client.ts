/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createInternalError,
  createToolNotFoundError,
  esqlToolProviderId,
} from '@kbn/onechat-common';
import { EsqlToolDefinition } from '@kbn/onechat-server';
import {
  EsqlToolCreateRequest,
  EsqlToolCreateResponse,
  EsqlToolUpdateRequest,
} from '../../../../common/tools';
import { esqlToolIndexName } from './storage';
import { EsqlToolStorage } from './storage';
import { ElasticsearchClient } from '@kbn/core/server';

export interface EsqlToolClient {
  get(toolId: string): Promise<EsqlToolDefinition>;
  list(): Promise<EsqlToolDefinition[]>;
  create(esqlTool: EsqlToolCreateResponse): Promise<EsqlToolCreateResponse>;
  update(toolId: string, updates: Partial<EsqlToolCreateRequest>): Promise<EsqlToolCreateResponse>;
  delete(toolId: string): Promise<boolean>;
  execute(toolId: string, params: Record<string, any>): Promise<any>;
}

export const createClient = ({ storage, esClient }: { storage: EsqlToolStorage, esClient: ElasticsearchClient }): EsqlToolClient => {
  return new EsqlToolClientImpl({ storage, esClient });
};

class EsqlToolClientImpl {
  public readonly id = esqlToolProviderId;
  private readonly storage: EsqlToolStorage;
  private readonly esClient: ElasticsearchClient;

  constructor({ storage, esClient }: { storage: EsqlToolStorage, esClient: ElasticsearchClient }) {
    this.storage = storage;
    this.esClient = esClient
  }

  async get(id: string): Promise<EsqlToolDefinition> {
    try {
      const document = await this.storage.getClient().get({ id });

      const tool = document._source as EsqlToolDefinition;
      return tool;
    } catch (isToolNotFoundError) {
      throw createToolNotFoundError({
        toolId: `tool::${id}`,
        customMessage: `Tool with id ${id} not found`,
      });
    }
  }

  async list(): Promise<EsqlToolDefinition[]> {
    const document = await this.storage.getClient().search({
      index: esqlToolIndexName,
      query: {
        match_all: {},
      },
      size: 1000,
      track_total_hits: true,
    });

    return document.hits.hits.map((hit) => hit._source as EsqlToolDefinition);
  }

  async create(tool: EsqlToolCreateRequest) {
    if ((await this.list()).map((t) => t.id).includes(tool.id)) {
      throw createInternalError(`Tool with id ${tool.id} already exists`);
    }
    const document = {
      ...tool,
      meta: {
        providerId: esqlToolProviderId,
        tags: tool.meta?.tags ?? [],
      },
    };

    await this.storage.getClient().index({
      id: tool.id,
      document,
    });

    return document as EsqlToolCreateResponse;
  }
  async update(id: string, updates: EsqlToolUpdateRequest): Promise<EsqlToolCreateResponse> {
    const now = new Date();
    let tool: EsqlToolCreateResponse | null = null;

    try {
      const document = await this.storage.getClient().get({ id });
      tool = document._source as EsqlToolCreateResponse;
    } catch (error) {
      tool = null;
    }
    const updatedTool = {
      id: updates.id ?? tool!.id,
      name: updates.name ?? (tool?.name || id),
      description: updates.description ?? tool!.description,
      query: updates.query ?? tool!.query,
      params: updates.params ?? tool!.params,
      meta: {
        providerId: esqlToolProviderId,
        tags: tool?.meta?.tags ?? updates.meta?.tags ?? [],
      },
      created_at: tool?.created_at ?? now.toISOString(),
      updated_at: now.toISOString(),
    };

    await this.storage.getClient().index({
      id,
      document: updatedTool,
    });

    return updatedTool;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.storage.getClient().delete({ id });
    if (result.result === 'not_found') {
      throw createToolNotFoundError({
        toolId: `tool::${id}`,
        customMessage: `Tool with id ${id} not found`,
      });
    }
    return true;
  }

  async execute(id: string, params: Record<string, any>): Promise<any> {
    const document = await this.get(id);
    const paramArray = Object.entries(params).map(([key, value]) => ({
      [key]: value
    }));
    
    const response = await this.esClient.transport.request({
      method: 'POST',
      path: '/_query',
      body: {
        query: document.query,
        params: paramArray
      }
    });
    
    return response;
  }
}

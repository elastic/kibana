/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  ToolType,
  ToolDescriptor,
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
import { ToolStorage, createStorage } from './storage';
import { fromEs, Document } from './converters';

export interface ToolClient {
  get(toolId: string): Promise<ToolDescriptor>;
  list(): Promise<EsqlToolDefinition[]>;
  create(esqlTool: EsqlToolCreateResponse): Promise<ToolDescriptor>;
  update(toolId: string, updates: Partial<EsqlToolCreateRequest>): Promise<ToolDescriptor>;
  delete(toolId: string): Promise<boolean>;
}

export const createClient = ({
  type,
  logger,
  esClient,
}: {
  type: ToolType;
  logger: Logger;
  esClient: ElasticsearchClient;
}): ToolClient => {
  const storage = createStorage({ logger, esClient });
  return new ToolClientImpl({ storage, type });
};

class ToolClientImpl {
  private readonly storage: ToolStorage;
  private readonly type: ToolType;

  constructor({ storage, type }: { storage: ToolStorage; type: ToolType }) {
    this.storage = storage;
    this.type = type;
  }

  async get(id: string): Promise<ToolDescriptor> {
    try {
      const document = await this.storage.getClient().get({ id });
      // TODO: check type
      return fromEs(document);
    } catch (e) {
      if (e instanceof esErrors.ResponseError && e.statusCode === 404) {
        throw createToolNotFoundError({
          toolId: id,
          toolType: this.type,
        });
      } else {
        throw e;
      }
    }
  }

  async list(): Promise<ToolDescriptor[]> {
    const document = await this.storage.getClient().search({
      query: {
        bool: {
          must: [{ term: { type: this.type } }],
        },
      },
      size: 1000,
      track_total_hits: true,
    });

    return document.hits.hits.map((hit) => fromEs(hit as Document));
  }

  // TODO: all this

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
  async update(id: string, updates: EsqlToolUpdateRequest): Promise<ToolDescriptor> {
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
      throw createToolNotFoundError({ toolId: id });
    }
    return true;
  }
}

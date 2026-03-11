/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { createToolNotFoundError, createBadRequestError } from '@kbn/agent-builder-common';
import type { ToolCreateParams } from '@kbn/agent-builder-server';
import { createSpaceDslFilter } from '../../../../utils/spaces';
import type { ToolTypeUpdateParams } from '../../tool_provider';
import type { ToolStorage } from './storage';
import { createStorage } from './storage';
import { fromEs, createAttributes, updateDocument } from './converters';
import type { ToolDocument, ToolPersistedDefinition } from './types';

/**
 * Client for persisted tool definitions.
 */
export interface ToolClient {
  get(toolId: string): Promise<ToolPersistedDefinition>;
  list(): Promise<ToolPersistedDefinition[]>;
  create(esqlTool: ToolCreateParams): Promise<ToolPersistedDefinition>;
  update(toolId: string, updates: ToolTypeUpdateParams): Promise<ToolPersistedDefinition>;
  delete(toolId: string): Promise<boolean>;
}

export const createClient = ({
  space,
  logger,
  esClient,
}: {
  space: string;
  logger: Logger;
  esClient: ElasticsearchClient;
}): ToolClient => {
  const storage = createStorage({ logger, esClient });
  return new ToolClientImpl({ space, storage });
};

class ToolClientImpl {
  private readonly space: string;
  private readonly storage: ToolStorage;

  constructor({ space, storage }: { space: string; storage: ToolStorage }) {
    this.space = space;
    this.storage = storage;
  }

  async get(id: string): Promise<ToolPersistedDefinition> {
    const document = await this._get(id);
    if (!document) {
      throw createToolNotFoundError({
        toolId: id,
      });
    }
    return fromEs(document);
  }

  async list(): Promise<ToolPersistedDefinition[]> {
    const document = await this.storage.getClient().search({
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space)],
        },
      },
      size: 1000,
      track_total_hits: false,
    });

    return document.hits.hits.map((hit) => fromEs(hit as ToolDocument));
  }

  async create(createRequest: ToolCreateParams): Promise<ToolPersistedDefinition> {
    const { id } = createRequest;

    const document = await this._get(id);
    if (document) {
      throw createBadRequestError(`Tool with id '${id}' already exists.`);
    }

    const attributes = createAttributes({ createRequest, space: this.space });

    await this.storage.getClient().index({
      document: attributes,
    });

    return this.get(id);
  }

  async update(id: string, update: ToolTypeUpdateParams): Promise<ToolPersistedDefinition> {
    const document = await this._get(id);
    if (!document) {
      throw createToolNotFoundError({
        toolId: id,
      });
    }

    const updatedAttributes = updateDocument({
      current: document._source!,
      update,
    });

    await this.storage.getClient().index({
      id: document._id,
      document: updatedAttributes,
    });

    return fromEs({
      _id: document._id,
      _source: updatedAttributes,
    });
  }

  async delete(id: string): Promise<boolean> {
    const document = await this._get(id);
    if (!document) {
      throw createToolNotFoundError({ toolId: id });
    }
    const result = await this.storage.getClient().delete({ id: document._id });
    if (result.result === 'not_found') {
      throw createToolNotFoundError({ toolId: id });
    }
    return true;
  }

  async _get(id: string): Promise<ToolDocument | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space), { term: { id } }],
        },
      },
    });
    if (response.hits.hits.length === 0) {
      return undefined;
    } else {
      return response.hits.hits[0] as ToolDocument;
    }
  }
}

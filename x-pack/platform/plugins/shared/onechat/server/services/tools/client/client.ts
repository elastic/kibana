/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { createToolNotFoundError, createBadRequestError } from '@kbn/onechat-common';
import { ToolTypeCreateParams, ToolTypeUpdateParams } from '../tool_provider';
import { ToolStorage, createStorage } from './storage';
import { fromEs, createAttributes, updateDocument } from './converters';
import { ToolDocument, ToolPersistedDefinition } from './types';

/**
 * Client for persisted tool definitions.
 */
export interface ToolClient {
  get(toolId: string): Promise<ToolPersistedDefinition>;
  list(): Promise<ToolPersistedDefinition[]>;
  create(esqlTool: ToolTypeCreateParams): Promise<ToolPersistedDefinition>;
  update(toolId: string, updates: ToolTypeUpdateParams): Promise<ToolPersistedDefinition>;
  delete(toolId: string): Promise<boolean>;
}

export const createClient = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): ToolClient => {
  const storage = createStorage({ logger, esClient });
  return new ToolClientImpl({ storage });
};

class ToolClientImpl {
  private readonly storage: ToolStorage;

  constructor({ storage }: { storage: ToolStorage }) {
    this.storage = storage;
  }

  async get(id: string): Promise<ToolPersistedDefinition> {
    try {
      const document = await this.storage.getClient().get({ id });
      return fromEs(document);
    } catch (e) {
      if (e instanceof esErrors.ResponseError && e.statusCode === 404) {
        throw createToolNotFoundError({
          toolId: id,
        });
      } else {
        throw e;
      }
    }
  }

  async list(): Promise<ToolPersistedDefinition[]> {
    const document = await this.storage.getClient().search({
      query: {
        match_all: {},
      },
      size: 1000,
      track_total_hits: true,
    });

    return document.hits.hits.map((hit) => fromEs(hit as ToolDocument));
  }

  async create(createRequest: ToolTypeCreateParams): Promise<ToolPersistedDefinition> {
    let exists: boolean;
    try {
      await this.storage.getClient().get({ id: createRequest.id });
      exists = true;
    } catch (e) {
      if (e instanceof esErrors.ResponseError && e.statusCode === 404) {
        exists = false;
      } else {
        throw e;
      }
    }
    if (exists) {
      throw createBadRequestError(`Tool with id '${createRequest.id}' already exists.`);
    }

    const attributes = createAttributes({ createRequest });

    await this.storage.getClient().index({
      id: createRequest.id,
      document: attributes,
    });

    return fromEs({
      _id: createRequest.id,
      _source: attributes,
    });
  }

  async update(id: string, update: ToolTypeUpdateParams): Promise<ToolPersistedDefinition> {
    let document: ToolDocument;
    try {
      document = await this.storage.getClient().get({ id });
    } catch (e) {
      if (e instanceof esErrors.ResponseError && e.statusCode === 404) {
        throw createToolNotFoundError({
          toolId: id,
        });
      } else {
        throw e;
      }
    }

    const updatedAttributes = updateDocument({
      current: document._source!,
      update,
    });

    await this.storage.getClient().index({
      id,
      document: updatedAttributes,
    });

    return fromEs({
      _id: id,
      _source: updatedAttributes,
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.storage.getClient().delete({ id });
    if (result.result === 'not_found') {
      throw createToolNotFoundError({ toolId: id });
    }
    return true;
  }
}

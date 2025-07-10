/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ToolDescriptor, createToolNotFoundError } from '@kbn/onechat-common';
import { EsqlToolDefinition } from '@kbn/onechat-server';

import { ToolTypeCreateParams, ToolTypeUpdateParams } from '../tool_provider';
import { ToolStorage, createStorage } from './storage';
import { fromEs, createAttributes, updateDocument, Document } from './converters';

/**
 * Client for tolol persisted definitions.
 */
export interface ToolClient {
  get(toolId: string): Promise<ToolDescriptor>;
  list(): Promise<ToolDescriptor[]>;
  create(esqlTool: ToolTypeCreateParams): Promise<ToolDescriptor>;
  update(toolId: string, updates: ToolTypeUpdateParams): Promise<ToolDescriptor>;
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

  async get(id: string): Promise<ToolDescriptor> {
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

  async list(): Promise<ToolDescriptor[]> {
    const document = await this.storage.getClient().search({
      query: {
        match_all: {},
      },
      size: 1000,
      track_total_hits: true,
    });

    return document.hits.hits.map((hit) => fromEs(hit as Document));
  }

  async create(createRequest: ToolTypeCreateParams) {
    // if ((await this.list()).map((t) => t.id).includes(tool.id)) {
    //  throw createInternalError(`Tool with id ${tool.id} already exists`);
    // }

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

  // TODO: all this

  async update(id: string, update: ToolTypeUpdateParams): Promise<ToolDescriptor> {
    let document: Document;
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

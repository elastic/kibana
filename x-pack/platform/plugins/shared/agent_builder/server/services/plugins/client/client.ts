/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { createBadRequestError, createPluginNotFoundError } from '@kbn/agent-builder-common';
import { createSpaceDslFilter } from '../../../utils/spaces';
import type { PluginStorage } from './storage';
import { createStorage } from './storage';
import { fromEs, createRequestToEs, updateRequestToEs } from './converters';
import type {
  PluginDocument,
  PersistedPluginDefinition,
  PluginCreateRequest,
  PluginUpdateRequest,
} from './types';

const MAX_PLUGINS_PER_SPACE = 1000;

export interface PluginClient {
  get(pluginId: string): Promise<PersistedPluginDefinition>;
  list(): Promise<PersistedPluginDefinition[]>;
  has(pluginId: string): Promise<boolean>;
  findByName(name: string): Promise<PersistedPluginDefinition | undefined>;
  create(request: PluginCreateRequest): Promise<PersistedPluginDefinition>;
  update(pluginId: string, updates: PluginUpdateRequest): Promise<PersistedPluginDefinition>;
  delete(pluginId: string): Promise<void>;
}

export const createClient = ({
  space,
  logger,
  esClient,
}: {
  space: string;
  logger: Logger;
  esClient: ElasticsearchClient;
}): PluginClient => {
  const storage = createStorage({ logger, esClient });
  return new PluginClientImpl({ space, storage, logger });
};

class PluginClientImpl implements PluginClient {
  private readonly space: string;
  private readonly storage: PluginStorage;
  private readonly logger: Logger;

  constructor({
    space,
    storage,
    logger,
  }: {
    space: string;
    storage: PluginStorage;
    logger: Logger;
  }) {
    this.space = space;
    this.storage = storage;
    this.logger = logger;
  }

  async get(pluginId: string): Promise<PersistedPluginDefinition> {
    const document = await this._getById(pluginId);
    if (!document) {
      throw createPluginNotFoundError({ pluginId });
    }
    return fromEs(document);
  }

  async list(): Promise<PersistedPluginDefinition[]> {
    const response = await this.storage.getClient().search({
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space)],
        },
      },
      size: MAX_PLUGINS_PER_SPACE,
      track_total_hits: true,
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    if (total > MAX_PLUGINS_PER_SPACE) {
      this.logger.warn(
        `Space "${this.space}" has ${total} plugins which exceeds the limit of ${MAX_PLUGINS_PER_SPACE}. Results are truncated.`
      );
    }

    return response.hits.hits.map((hit) => fromEs(hit as PluginDocument));
  }

  async has(pluginId: string): Promise<boolean> {
    const document = await this._getById(pluginId);
    return document !== undefined;
  }

  async findByName(name: string): Promise<PersistedPluginDefinition | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space), { term: { name } }],
        },
      },
    });
    if (response.hits.hits.length === 0) {
      return undefined;
    }
    return fromEs(response.hits.hits[0] as PluginDocument);
  }

  async create(createRequest: PluginCreateRequest): Promise<PersistedPluginDefinition> {
    const existing = await this.findByName(createRequest.name);
    if (existing) {
      throw createBadRequestError(
        `Plugin with name '${createRequest.name}' already exists (id: ${existing.id}).`
      );
    }

    const id = randomUUID();
    const attributes = createRequestToEs({
      id,
      createRequest,
      space: this.space,
    });

    await this.storage.getClient().index({
      document: attributes,
    });

    return this.get(id);
  }

  async update(pluginId: string, update: PluginUpdateRequest): Promise<PersistedPluginDefinition> {
    const document = await this._getById(pluginId);
    if (!document) {
      throw createPluginNotFoundError({ pluginId });
    }

    const updatedAttributes = updateRequestToEs({
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

  async delete(pluginId: string): Promise<void> {
    const document = await this._getById(pluginId);
    if (!document) {
      throw createPluginNotFoundError({ pluginId });
    }
    const result = await this.storage.getClient().delete({ id: document._id });
    if (result.result === 'not_found') {
      throw createPluginNotFoundError({ pluginId });
    }
  }

  private async _getById(pluginId: string): Promise<PluginDocument | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space), { term: { id: pluginId } }],
        },
      },
    });
    if (response.hits.hits.length === 0) {
      return undefined;
    }
    return response.hits.hits[0] as PluginDocument;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  createBadRequestError,
  createSkillNotFoundError,
  type PersistedSkillCreateRequest,
  type PersistedSkillUpdateRequest,
} from '@kbn/agent-builder-common';
import { createSpaceDslFilter } from '../../../../utils/spaces';
import type { SkillStorage } from './storage';
import { createStorage } from './storage';
import { fromEs, createAttributes, updateDocument } from './converters';
import type { SkillDocument, SkillPersistedDefinition } from './types';

const MAX_SKILLS_PER_SPACE = 1000;

/**
 * Client for persisted skill definitions.
 */
export interface SkillClient {
  get(skillId: string): Promise<SkillPersistedDefinition>;
  list(): Promise<SkillPersistedDefinition[]>;
  create(request: PersistedSkillCreateRequest): Promise<SkillPersistedDefinition>;
  update(skillId: string, updates: PersistedSkillUpdateRequest): Promise<SkillPersistedDefinition>;
  /**
   * Deletes a skill. Throws if the skill does not exist.
   */
  delete(skillId: string): Promise<void>;
  has(skillId: string): Promise<boolean>;
}

export const createClient = ({
  space,
  logger,
  esClient,
}: {
  space: string;
  logger: Logger;
  esClient: ElasticsearchClient;
}): SkillClient => {
  const storage = createStorage({ logger, esClient });
  return new SkillClientImpl({ space, storage, logger });
};

class SkillClientImpl implements SkillClient {
  private readonly space: string;
  private readonly storage: SkillStorage;
  private readonly logger: Logger;

  constructor({
    space,
    storage,
    logger,
  }: {
    space: string;
    storage: SkillStorage;
    logger: Logger;
  }) {
    this.space = space;
    this.storage = storage;
    this.logger = logger;
  }

  async get(id: string): Promise<SkillPersistedDefinition> {
    const document = await this._get(id);
    if (!document) {
      throw createSkillNotFoundError({ skillId: id });
    }
    return fromEs(document);
  }

  async list(): Promise<SkillPersistedDefinition[]> {
    const response = await this.storage.getClient().search({
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space)],
        },
      },
      size: MAX_SKILLS_PER_SPACE,
      track_total_hits: true,
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    if (total > MAX_SKILLS_PER_SPACE) {
      this.logger.warn(
        `Space "${this.space}" has ${total} skills which exceeds the limit of ${MAX_SKILLS_PER_SPACE}. Results are truncated.`
      );
    }

    return response.hits.hits.map((hit) => fromEs(hit as SkillDocument));
  }

  async create(createRequest: PersistedSkillCreateRequest): Promise<SkillPersistedDefinition> {
    const { id } = createRequest;

    // Defense-in-depth: the registry already checks uniqueness across all
    // providers, but we verify again at the storage layer to guard against
    // direct client usage or concurrent writes.
    const document = await this._get(id);
    if (document) {
      throw createBadRequestError(`Skill with id '${id}' already exists.`);
    }

    const attributes = createAttributes({ createRequest, space: this.space });

    await this.storage.getClient().index({
      document: attributes,
    });

    return this.get(id);
  }

  async update(id: string, update: PersistedSkillUpdateRequest): Promise<SkillPersistedDefinition> {
    const document = await this._get(id);
    if (!document) {
      throw createSkillNotFoundError({ skillId: id });
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

  async delete(id: string): Promise<void> {
    const document = await this._get(id);
    if (!document) {
      throw createSkillNotFoundError({ skillId: id });
    }
    const result = await this.storage.getClient().delete({ id: document._id });
    if (result.result === 'not_found') {
      throw createSkillNotFoundError({ skillId: id });
    }
  }

  async has(id: string): Promise<boolean> {
    const document = await this._get(id);
    return document !== undefined;
  }

  private async _get(id: string): Promise<SkillDocument | undefined> {
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
      return response.hits.hits[0] as SkillDocument;
    }
  }
}

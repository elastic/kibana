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
import { createStorage, skillIndexName } from './storage';
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
   * Deletes a skill. Throws if the skill does not exist or is plugin-managed.
   */
  delete(skillId: string): Promise<void>;
  /**
   * Creates multiple skills in a single bulk request.
   * Optimized for plugin installation where IDs are deterministic.
   * Does not perform per-skill uniqueness checks.
   */
  bulkCreate(requests: PersistedSkillCreateRequest[]): Promise<SkillPersistedDefinition[]>;
  /**
   * Deletes all skills associated with the given plugin.
   */
  deleteByPluginId(pluginId: string): Promise<void>;
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
  return new SkillClientImpl({ space, storage, logger, esClient });
};

class SkillClientImpl implements SkillClient {
  private readonly space: string;
  private readonly storage: SkillStorage;
  private readonly logger: Logger;
  private readonly esClient: ElasticsearchClient;

  constructor({
    space,
    storage,
    logger,
    esClient,
  }: {
    space: string;
    storage: SkillStorage;
    logger: Logger;
    esClient: ElasticsearchClient;
  }) {
    this.space = space;
    this.storage = storage;
    this.logger = logger;
    this.esClient = esClient;
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

  async bulkCreate(requests: PersistedSkillCreateRequest[]): Promise<SkillPersistedDefinition[]> {
    if (requests.length === 0) {
      return [];
    }

    const creationDate = new Date();
    const allAttributes = requests.map((createRequest) =>
      createAttributes({ createRequest, space: this.space, creationDate })
    );

    await this.storage.getClient().bulk({
      operations: allAttributes.map((attributes) => ({
        index: { document: attributes },
      })),
      throwOnFail: true,
    });

    return allAttributes.map((attributes) => ({
      id: attributes.id,
      name: attributes.name,
      description: attributes.description,
      content: attributes.content,
      referenced_content: attributes.referenced_content,
      tool_ids: attributes.tool_ids,
      plugin_id: attributes.plugin_id,
      created_at: attributes.created_at,
      updated_at: attributes.updated_at,
    }));
  }

  async update(id: string, update: PersistedSkillUpdateRequest): Promise<SkillPersistedDefinition> {
    const document = await this._get(id);
    if (!document) {
      throw createSkillNotFoundError({ skillId: id });
    }

    const skill = fromEs(document);
    if (skill.plugin_id) {
      throw createBadRequestError(
        `Skill '${id}' is managed by plugin '${skill.plugin_id}' and cannot be modified directly.`
      );
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

    const skill = fromEs(document);
    if (skill.plugin_id) {
      throw createBadRequestError(
        `Skill '${id}' is managed by plugin '${skill.plugin_id}' and cannot be deleted directly.`
      );
    }

    const result = await this.storage.getClient().delete({ id: document._id });
    if (result.result === 'not_found') {
      throw createSkillNotFoundError({ skillId: id });
    }
  }

  async deleteByPluginId(pluginId: string): Promise<void> {
    await this.esClient.deleteByQuery({
      index: `${skillIndexName}*`,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space), { term: { plugin_id: pluginId } }],
        },
      },
    });
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

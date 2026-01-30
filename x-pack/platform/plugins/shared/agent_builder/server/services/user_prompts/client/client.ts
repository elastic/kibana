/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { createBadRequestError } from '@kbn/agent-builder-common';
import { createSpaceDslFilter } from '../../../utils/spaces';
import type { UserPromptStorage } from './storage';
import { createStorage } from './storage';
import { fromEs, createAttributes, updateDocument } from './converters';
import type {
  CreateUserPromptPayload as UserPromptCreateParams,
  UpdateUserPromptPayload as UserPromptUpdateParams,
  UserPrompt,
} from '../../../../common/http_api/user_prompts';
import type { UserPromptDocument, FindUserPromptsParams, FindUserPromptsResult } from './types';

const createUserPromptNotFoundError = (promptId: string) => {
  return createBadRequestError(`User prompt with id '${promptId}' not found`);
};

/**
 * Client for persisted user prompt definitions.
 */
export interface UserPromptClient {
  get(promptId: string): Promise<UserPrompt>;
  find(params?: FindUserPromptsParams): Promise<FindUserPromptsResult>;
  create(prompt: UserPromptCreateParams): Promise<UserPrompt>;
  update(promptId: string, updates: UserPromptUpdateParams): Promise<UserPrompt>;
  delete(promptId: string): Promise<boolean>;
}

export const createClient = ({
  space,
  username,
  logger,
  esClient,
}: {
  space: string;
  username: string;
  logger: Logger;
  esClient: ElasticsearchClient;
}): UserPromptClient => {
  const storage = createStorage({ logger, esClient });
  return new UserPromptClientImpl({ space, username, storage });
};

class UserPromptClientImpl implements UserPromptClient {
  private readonly space: string;
  private readonly username: string;
  private readonly storage: UserPromptStorage;

  constructor({
    space,
    username,
    storage,
  }: {
    space: string;
    username: string;
    storage: UserPromptStorage;
  }) {
    this.space = space;
    this.username = username;
    this.storage = storage;
  }

  async get(id: string): Promise<UserPrompt> {
    const document = await this._get(id);
    if (!document) {
      throw createUserPromptNotFoundError(id);
    }
    return fromEs(document);
  }

  async find(params: FindUserPromptsParams = {}): Promise<FindUserPromptsResult> {
    const { query, page = 1, perPage = 20 } = params;
    const from = (page - 1) * perPage;

    const filters: QueryDslQueryContainer[] = [createSpaceDslFilter(this.space)];

    // Add search query if provided
    let searchQuery: QueryDslQueryContainer | undefined;
    if (query?.trim()) {
      const trimmedQuery = query.trim();
      // Use appropriate query types for each field:
      // - wildcard on name (keyword field) for substring matching
      // - match_phrase_prefix on content (text field) allows prefix matching on last term
      searchQuery = {
        bool: {
          should: [
            // Wildcard on name (keyword field) for substring matching
            {
              wildcard: {
                name: {
                  value: `*${trimmedQuery}*`,
                  case_insensitive: true,
                },
              },
            },
            // match_phrase_prefix on content (text field) - allows prefix matching
            {
              match_phrase_prefix: {
                content: {
                  query: trimmedQuery,
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      };
    }

    const response = await this.storage.getClient().search({
      query: {
        bool: {
          filter: filters,
          ...(searchQuery && { must: [searchQuery] }),
        },
      },
      from,
      size: perPage,
      track_total_hits: true,
      sort: [{ updated_at: { order: 'desc' } }],
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    return {
      page,
      perPage,
      total,
      data: response.hits.hits.map((hit) => fromEs(hit as UserPromptDocument)),
    };
  }

  async create(createRequest: UserPromptCreateParams): Promise<UserPrompt> {
    const { id } = createRequest;

    const document = await this._get(id);
    if (document) {
      throw createBadRequestError(`User prompt with id '${id}' already exists.`);
    }

    const attributes = createAttributes({
      createRequest,
      space: this.space,
      username: this.username,
    });

    await this.storage.getClient().index({
      document: attributes,
    });

    return this.get(id);
  }

  async update(id: string, update: UserPromptUpdateParams): Promise<UserPrompt> {
    const document = await this._get(id);
    if (!document) {
      throw createUserPromptNotFoundError(id);
    }

    const updatedAttributes = updateDocument({
      current: document._source!,
      update,
      username: this.username,
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
      throw createUserPromptNotFoundError(id);
    }
    const result = await this.storage.getClient().delete({ id: document._id });
    if (result.result === 'not_found') {
      throw createUserPromptNotFoundError(id);
    }
    return true;
  }

  private async _get(id: string): Promise<UserPromptDocument | undefined> {
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
      return response.hits.hits[0] as UserPromptDocument;
    }
  }
}

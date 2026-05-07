/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import {
  type UserIdAndName,
  type Conversation,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import type {
  ConversationCreateRequest,
  ConversationUpdateRequest,
  ConversationListOptions,
} from './types';
import { createSpaceDslFilter } from '../../../utils/spaces';
import type { ConversationStorage } from './storage';
import { createStorage } from './storage';
import {
  fromEs,
  fromEsWithoutRounds,
  toEs,
  createRequestToEs,
  updateConversation,
  type Document,
} from './converters';

export interface ConversationClient {
  get(conversationId: string): Promise<Conversation>;
  exists(conversationId: string): Promise<boolean>;
  create(conversation: ConversationCreateRequest): Promise<Conversation>;
  update(conversation: ConversationUpdateRequest): Promise<Conversation>;
  list(options?: ConversationListOptions): Promise<ConversationWithoutRounds[]>;
  delete(conversationId: string): Promise<boolean>;
}

export const createClient = ({
  space,
  logger,
  esClient,
  user,
}: {
  space: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  user: UserIdAndName;
}): ConversationClient => {
  const storage = createStorage({ logger, esClient });
  return new ConversationClientImpl({ storage, user, space });
};

class ConversationClientImpl implements ConversationClient {
  private readonly space: string;
  private readonly storage: ConversationStorage;
  private readonly user: UserIdAndName;

  constructor({
    storage,
    user,
    space,
  }: {
    storage: ConversationStorage;
    user: UserIdAndName;
    space: string;
  }) {
    this.storage = storage;
    this.user = user;
    this.space = space;
  }

  async list(options: ConversationListOptions = {}): Promise<ConversationWithoutRounds[]> {
    const { agentId, sessionMode } = options;

    const sessionModeFilter = (() => {
      if (sessionMode === 'standing') {
        return [{ term: { session_mode: 'standing' } }];
      }
      if (sessionMode === 'interactive') {
        return [
          {
            bool: {
              should: [
                { term: { session_mode: 'interactive' } },
                { bool: { must_not: { exists: { field: 'session_mode' } } } },
              ],
            },
          },
        ];
      }
      return [];
    })();

    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1000,
      _source: [
        'agent_id',
        'user_id',
        'user_name',
        'title',
        'created_at',
        'updated_at',
        'session_mode',
        'state',
      ],
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space)],
          must: [
            {
              term: { user_name: this.user.username },
            },
            ...(agentId ? [{ term: { agent_id: agentId } }] : []),
            ...sessionModeFilter,
          ],
        },
      },
    });

    return response.hits.hits.map((hit) => fromEsWithoutRounds(hit as Document));
  }

  async get(conversationId: string): Promise<Conversation> {
    const document = await this._get(conversationId);
    if (!document) {
      throw createConversationNotFoundError({ conversationId });
    }

    if (!hasAccess({ conversation: document, user: this.user })) {
      throw createConversationNotFoundError({ conversationId });
    }

    return fromEs(document);
  }

  async exists(conversationId: string): Promise<boolean> {
    const document = await this._get(conversationId);
    if (!document) {
      return false;
    }
    return hasAccess({ conversation: document, user: this.user });
  }

  async create(conversation: ConversationCreateRequest): Promise<Conversation> {
    const now = new Date();
    const id = conversation.id ?? uuidv4();

    const attributes = createRequestToEs({
      conversation,
      currentUser: this.user,
      creationDate: now,
      space: this.space,
    });

    await this.storage.getClient().index({
      id,
      document: attributes,
    });

    return this.get(id);
  }

  async update(conversationUpdate: ConversationUpdateRequest): Promise<Conversation> {
    const { id: conversationId } = conversationUpdate;
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const now = new Date();
      const document = await this._get(conversationUpdate.id);
      if (!document) {
        throw createConversationNotFoundError({ conversationId });
      }

      if (!hasAccess({ conversation: document, user: this.user })) {
        throw createConversationNotFoundError({ conversationId });
      }

      const storedConversation = fromEs(document);

      // On retry: merge only the rounds that aren't already stored so that
      // rounds written by a concurrent execution are preserved.
      const effectiveUpdate =
        attempt === 0 || !conversationUpdate.rounds
          ? conversationUpdate
          : mergeRoundsForRetry(storedConversation, conversationUpdate);

      const updatedConversation = updateConversation({
        conversation: storedConversation,
        update: effectiveUpdate,
        updateDate: now,
        space: this.space,
      });
      const attributes = toEs(updatedConversation, this.space);

      try {
        await this.storage.getClient().index({
          id: conversationUpdate.id,
          document: attributes,
          // use optimistic concurrency control to prevent concurrent update conflicts
          if_seq_no: document._seq_no,
          if_primary_term: document._primary_term,
        });
        return this.get(conversationUpdate.id);
      } catch (err) {
        const statusCode =
          (err as { meta?: { statusCode?: number }; statusCode?: number })?.meta?.statusCode ??
          (err as { statusCode?: number })?.statusCode;

        if (statusCode === 409 && attempt < MAX_RETRIES - 1) {
          continue;
        }
        throw err;
      }
    }

    throw createConversationNotFoundError({ conversationId });
  }

  async delete(conversationId: string): Promise<boolean> {
    const document = await this._get(conversationId);
    if (!document) {
      throw createConversationNotFoundError({ conversationId });
    }

    if (!hasAccess({ conversation: document, user: this.user })) {
      throw createConversationNotFoundError({ conversationId });
    }

    const { result } = await this.storage.getClient().delete({ id: conversationId });
    return result === 'deleted';
  }

  private async _get(conversationId: string): Promise<Document | undefined> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1,
      terminate_after: 1,
      query: {
        bool: {
          filter: [createSpaceDslFilter(this.space), { term: { _id: conversationId } }],
        },
      },
    });
    if (response.hits.hits.length === 0) {
      return undefined;
    } else {
      return response.hits.hits[0] as Document;
    }
  }
}

/**
 * On a 409 OCC retry, merge the update's rounds with the freshly-read stored
 * conversation so that rounds written by a concurrent execution are preserved.
 * Only rounds whose IDs are absent from the stored conversation are appended.
 */
const mergeRoundsForRetry = (
  stored: { rounds: Array<{ id: string }> },
  update: ConversationUpdateRequest
): ConversationUpdateRequest => {
  const storedIds = new Set(stored.rounds.map((r) => r.id));
  const newRounds = (update.rounds ?? []).filter((r) => !storedIds.has(r.id));
  return {
    ...update,
    rounds: [...stored.rounds, ...newRounds] as ConversationUpdateRequest['rounds'],
  };
};

const hasAccess = ({
  conversation,
  user,
}: {
  conversation: Pick<Document, '_source'>;
  user: UserIdAndName;
}) => {
  if (user.id && conversation._source!.user_id === user.id) {
    return true;
  }
  return conversation._source!.user_name === user.username;
};

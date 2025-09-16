/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ConversationWithoutRounds } from '@kbn/onechat-common';
import {
  type UserIdAndName,
  type Conversation,
  createConversationNotFoundError,
} from '@kbn/onechat-common';
import { isNotFoundError } from '@kbn/es-errors';
import type {
  ConversationCreateRequest,
  ConversationUpdateRequest,
  ConversationListOptions,
} from '../../../common/conversations';
import type { ConversationStorage } from './storage';
import {
  fromEs,
  fromEsWithoutRounds,
  toEs,
  createRequestToEs,
  updateConversation,
  type Document,
} from './converters';

export interface ConversationClient {
  get(conversationId: string, spaceId?: string): Promise<Conversation>;
  exists(conversationId: string): Promise<boolean>;
  create(conversation: ConversationCreateRequest): Promise<Conversation>;
  update(conversation: ConversationUpdateRequest): Promise<Conversation>;
  list(options?: ConversationListOptions): Promise<ConversationWithoutRounds[]>;
  delete(conversationId: string, spaceId?: string): Promise<void>;
}

export const createClient = ({
  storage,
  user,
}: {
  storage: ConversationStorage;
  user: UserIdAndName;
}): ConversationClient => {
  return new ConversationClientImpl({ storage, user });
};

class ConversationClientImpl implements ConversationClient {
  private readonly storage: ConversationStorage;
  private readonly user: UserIdAndName;

  constructor({ storage, user }: { storage: ConversationStorage; user: UserIdAndName }) {
    this.storage = storage;
    this.user = user;
  }

  async list(options: ConversationListOptions = {}): Promise<ConversationWithoutRounds[]> {
    const { agentId, spaceId } = options;

    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1000,
      _source: {
        excludes: ['rounds'],
      },
      query: {
        bool: {
          must: [
            {
              term: this.user.username
                ? { user_name: this.user.username }
                : { user_id: this.user.id },
            },
            ...(agentId ? [{ term: { agent_id: agentId } }] : []),
            ...(spaceId ? [{ term: { space_id: spaceId } }] : []),
          ],
        },
      },
    });

    return response.hits.hits.map((hit) => fromEsWithoutRounds(hit as Document));
  }

  async get(conversationId: string, spaceId?: string): Promise<Conversation> {
    try {
      const document = await this.storage.getClient().get({ id: conversationId });

      if (!hasAccess({ conversation: document, user: this.user })) {
        throw createConversationNotFoundError({ conversationId });
      }

      // If spaceId is provided, verify the conversation belongs to that space
      if (spaceId && document._source?.space_id !== spaceId) {
        throw createConversationNotFoundError({ conversationId });
      }

      return fromEs(document);
    } catch (error) {
      // If document doesn't exist, throw conversation not found error
      if (isNotFoundError(error)) {
        throw createConversationNotFoundError({ conversationId });
      }
      throw error;
    }
  }

  async exists(conversationId: string): Promise<boolean> {
    try {
      const document = await this.storage.getClient().get({ id: conversationId });
      return hasAccess({ conversation: document, user: this.user });
    } catch (error) {
      // Only catch 404 errors (document not found), re-throw all others
      if (isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async create(conversation: ConversationCreateRequest): Promise<Conversation> {
    const now = new Date();
    const id = conversation.id ?? uuidv4();

    const attributes = createRequestToEs({
      conversation,
      currentUser: this.user,
      creationDate: now,
    });

    await this.storage.getClient().index({
      id,
      document: attributes,
    });

    return this.get(id, conversation.space_id);
  }

  async update(conversationUpdate: ConversationUpdateRequest): Promise<Conversation> {
    const now = new Date();
    const document = await this.storage.getClient().get({ id: conversationUpdate.id });

    if (!hasAccess({ conversation: document, user: this.user })) {
      throw createConversationNotFoundError({ conversationId: conversationUpdate.id });
    }

    const storedConversation = fromEs(document);
    const updatedConversation = updateConversation({
      conversation: storedConversation,
      update: conversationUpdate,
      updateDate: now,
    });
    const attributes = toEs(updatedConversation);

    await this.storage.getClient().index({
      id: conversationUpdate.id,
      document: attributes,
    });

    return this.get(conversationUpdate.id);
  }

  async delete(conversationId: string, spaceId?: string): Promise<void> {
    const document = await this.storage.getClient().get({ id: conversationId });

    if (!hasAccess({ conversation: document, user: this.user })) {
      throw createConversationNotFoundError({ conversationId });
    }

    // If spaceId is provided, verify the conversation belongs to that space
    if (spaceId && document._source?.space_id !== spaceId) {
      throw createConversationNotFoundError({ conversationId });
    }

    await this.storage.getClient().delete({ id: conversationId });
  }
}

const hasAccess = ({
  conversation,
  user,
}: {
  conversation: Pick<Document, '_source'>;
  user: UserIdAndName;
}) => {
  return (
    conversation._source!.user_id === user.id || conversation._source!.user_name === user.username
  );
};

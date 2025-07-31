/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  type UserIdAndName,
  type Conversation,
  createConversationNotFoundError,
  ConversationWithoutRounds,
} from '@kbn/onechat-common';
import type {
  ConversationCreateRequest,
  ConversationUpdateRequest,
  ConversationListOptions,
} from '../../../common/conversations';
import { ConversationStorage } from './storage';
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
  create(conversation: ConversationCreateRequest): Promise<Conversation>;
  update(conversation: ConversationUpdateRequest): Promise<Conversation>;
  list(options?: ConversationListOptions): Promise<ConversationWithoutRounds[]>;
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
    const { agentId } = options;

    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 1000,
      _source: {
        excludes: ['rounds'],
      },
      query: {
        bool: {
          must: [
            { term: { user_id: this.user.id } },
            ...(agentId ? [{ term: { agent_id: agentId } }] : []),
          ],
        },
      },
    });

    return response.hits.hits.map((hit) => fromEsWithoutRounds(hit as Document));
  }

  async get(conversationId: string): Promise<Conversation> {
    const document = await this.storage.getClient().get({ id: conversationId });

    if (!hasAccess({ conversation: document, user: this.user })) {
      throw createConversationNotFoundError({ conversationId });
    }

    return fromEs(document);
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

    return this.get(id);
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
}

const hasAccess = ({
  conversation,
  user,
}: {
  conversation: Pick<Document, '_source'>;
  user: UserIdAndName;
}) => {
  return conversation._source!.user_id === user.id;
};

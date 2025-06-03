/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { UserIdAndName, Conversation } from '@kbn/onechat-common';
import type {
  ConversationCreateRequest,
  ConversationUpdateRequest,
  ConversationListOptions,
} from '../../../common/conversations';
import { ConversationStorage } from './storage';
import { fromEs, toEs, createRequestToEs, updateConversation, type Document } from './converters';

export interface ConversationClient {
  get(conversationId: string): Promise<Conversation>;
  create(conversation: ConversationCreateRequest): Promise<Conversation>;
  update(conversation: ConversationUpdateRequest): Promise<Conversation>;
  list(options?: ConversationListOptions): Promise<Conversation[]>;
  // TODO: delete
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

  async list(options: ConversationListOptions = {}): Promise<Conversation[]> {
    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 100,
      query: {
        bool: {
          must: [
            { term: { user_id: this.user.id } },
            ...(options.agentId ? [{ term: { agent_id: options.agentId } }] : []),
          ],
        },
      },
    });

    return response.hits.hits.map((hit) => fromEs(hit as Document));
  }

  async get(conversationId: string): Promise<Conversation> {
    const document = await this.storage.getClient().get({ id: conversationId });

    // TODO: access check

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

  async update(conversation: ConversationUpdateRequest): Promise<Conversation> {
    const document = await this.storage.getClient().get({ id: conversation.id });

    // TODO: access check

    const storedConversation = fromEs(document);
    const updatedConversation = updateConversation(storedConversation, conversation);
    const attributes = toEs(updatedConversation);

    await this.storage.getClient().index({
      id: conversation.id,
      document: attributes,
    });

    return this.get(conversation.id);
  }
}

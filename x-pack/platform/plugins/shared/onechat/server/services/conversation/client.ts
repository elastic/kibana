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
} from '../../../common/conversations';
import { ConversationStorage, createStorage, ConversationProperties } from './storage';
import { fromEs, createRequestToEs } from './converters';

export interface ConversationClient {
  get(conversationId: string): Promise<Conversation>;
  create(conversation: ConversationCreateRequest): Promise<Conversation>;
  // TODO: list
  // TODO: update
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

  async get(conversationId: string): Promise<Conversation> {
    const document = await this.storage.getClient().get({ id: conversationId });
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
}

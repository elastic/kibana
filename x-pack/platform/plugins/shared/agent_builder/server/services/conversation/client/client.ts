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
  type UserMessageEvent,
  type Conversation,
  createConversationNotFoundError,
  createFieldChangedUserActionEvents,
  resolveConversationEvents,
  timelineEventsToRounds,
} from '@kbn/agent-builder-common';
import type {
  ConversationCreateRequest,
  ConversationUpdateRequest,
  ConversationListOptions,
} from './types';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import { createSpaceDslFilter } from '../../../utils/spaces';
import type { ConversationStorage } from './storage';
import { createStorage } from './storage';
import {
  fromEs,
  fromEsWithoutRounds,
  toEs,
  createRequestToEs,
  updateConversation,
  normalizeEventsFromEs,
  type Document,
} from './converters';
import { createUserMessageEvent } from './append_message';
import {
  canDeleteConversation,
  hasReadAccess,
  hasWriteAccess,
} from './conversation_access';

export interface AppendMessageResult {
  conversation: Conversation;
  event: UserMessageEvent;
}

export interface ConversationClient {
  get(conversationId: string): Promise<Conversation>;
  exists(conversationId: string): Promise<boolean>;
  create(conversation: ConversationCreateRequest): Promise<Conversation>;
  update(conversation: ConversationUpdateRequest): Promise<Conversation>;
  appendMessage({
    conversationId,
    message,
    attachment_refs,
  }: {
    conversationId: string;
    message: string;
    attachment_refs?: AttachmentVersionRef[];
  }): Promise<AppendMessageResult>;
  getCurrentUser(): UserIdAndName;
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
    const { agentId } = options;

    const ownerShouldClauses = [
      { term: { user_name: this.user.username } },
      ...(this.user.id ? [{ term: { user_id: this.user.id } }] : []),
    ];

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
        'template_id',
        'template_snapshot',
        'chat_mode',
        'conversation_mode',
        'status',
        'read',
      ],
      query: {
        bool: {
          filter: [
            createSpaceDslFilter(this.space),
            ...(agentId ? [{ term: { agent_id: agentId } }] : []),
          ],
          should: [
            ...ownerShouldClauses,
            { term: { chat_mode: 'collaborative' } },
            { term: { 'template_snapshot.chat_mode': 'collaborative' } },
            { term: { conversation_mode: 'group' } },
          ],
          minimum_should_match: 1,
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

    if (!hasReadAccess({ source: document._source!, user: this.user })) {
      throw createConversationNotFoundError({ conversationId });
    }

    return fromEs(document);
  }

  async exists(conversationId: string): Promise<boolean> {
    const document = await this._get(conversationId);
    if (!document) {
      return false;
    }
    return hasReadAccess({ source: document._source!, user: this.user });
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

  getCurrentUser(): UserIdAndName {
    return this.user;
  }

  async appendMessage({
    conversationId,
    message,
    attachment_refs,
  }: {
    conversationId: string;
    message: string;
    attachment_refs?: AttachmentVersionRef[];
  }): Promise<AppendMessageResult> {
    const document = await this._get(conversationId);
    if (!document?._source) {
      throw createConversationNotFoundError({ conversationId });
    }

    if (!hasWriteAccess({ source: document._source, user: this.user })) {
      throw createConversationNotFoundError({ conversationId });
    }

    const conversation = fromEs(document);
    const userEvent = createUserMessageEvent({
      message,
      user: this.user,
      attachment_refs,
    });
    const persistedFromSource = normalizeEventsFromEs(document._source.events);
    const existingEvents =
      persistedFromSource.length > 0 ? persistedFromSource : resolveConversationEvents(conversation);
    const events = [...existingEvents, userEvent];

    const updatedConversation = await this.update({
      id: conversationId,
      events,
      rounds: timelineEventsToRounds(events),
    });

    return {
      conversation: updatedConversation,
      event: userEvent,
    };
  }

  async update(conversationUpdate: ConversationUpdateRequest): Promise<Conversation> {
    const { id: conversationId } = conversationUpdate;
    const now = new Date();
    const document = await this._get(conversationUpdate.id);
    if (!document) {
      throw createConversationNotFoundError({ conversationId });
    }

    if (!hasWriteAccess({ source: document._source!, user: this.user })) {
      throw createConversationNotFoundError({ conversationId });
    }

    const storedConversation = fromEs(document);
    let events = conversationUpdate.events ?? storedConversation.events ?? [];

    if (conversationUpdate.custom_fields !== undefined) {
      const previousFields = storedConversation.custom_fields ?? {};
      const nextFields = conversationUpdate.custom_fields;
      const auditEvents = createFieldChangedUserActionEvents({
        previousFields,
        nextFields,
        user: this.user,
        timestamp: now.toISOString(),
      });

      if (auditEvents.length > 0) {
        events = [...events, ...auditEvents];
      }
    }

    const updatedConversation = updateConversation({
      conversation: storedConversation,
      update: {
        ...conversationUpdate,
        events,
        ...(conversationUpdate.events !== undefined &&
          conversationUpdate.rounds === undefined && {
            rounds: timelineEventsToRounds(events),
          }),
      },
      updateDate: now,
      space: this.space,
    });
    const attributes = toEs(updatedConversation, this.space);

    await this.storage.getClient().index({
      id: conversationUpdate.id,
      document: attributes,
      // use optimistic concurrency control to prevent concurrent update conflicts
      if_seq_no: document._seq_no,
      if_primary_term: document._primary_term,
    });

    return this.get(conversationUpdate.id);
  }

  async delete(conversationId: string): Promise<boolean> {
    const document = await this._get(conversationId);
    if (!document) {
      throw createConversationNotFoundError({ conversationId });
    }

    if (!canDeleteConversation({ source: document._source!, user: this.user })) {
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

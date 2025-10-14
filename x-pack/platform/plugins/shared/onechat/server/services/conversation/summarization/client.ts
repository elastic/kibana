/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  type UserIdAndName,
  type Conversation,
  createConversationNotFoundError,
} from '@kbn/onechat-common';
import type { ModelProvider } from '@kbn/onechat-server';
import { createSpaceDslFilter } from '../../../utils/spaces';
import type { ConversationStorage } from './storage';
import { createStorage } from './storage';
import { fromEs, toEs, createConversationSummary, type Document } from './converters';
import type { ConversationSummary } from './types';
import { summarizeConversation } from './summarizer';

export interface SummarySearchParams {
  term: string;
  keywords?: string[];
  questions?: string[];
}

export interface ConversationSummaryService {
  get(conversationId: string): Promise<ConversationSummary>;
  exists(conversationId: string): Promise<boolean>;
  create(conversation: Conversation): Promise<ConversationSummary>;
  update(conversation: Conversation): Promise<ConversationSummary>;
  search(params: SummarySearchParams): Promise<ConversationSummary[]>;
  delete(conversationId: string): Promise<boolean>;
}

export const createService = async ({
  spaceId,
  security,
  esClient,
  request,
  modelProvider,
  logger,
}: {
  spaceId: string;
  logger: Logger;
  security: SecurityServiceStart;
  request: KibanaRequest;
  esClient: ElasticsearchClient;
  modelProvider: ModelProvider;
}): Promise<ConversationSummaryService> => {
  const authUser = security.authc.getCurrentUser(request);
  if (!authUser) {
    throw new Error('No user bound to the provided request');
  }
  const user = { id: authUser.profile_uid!, username: authUser.username };
  const storage = createStorage({ logger, esClient });
  return new ConversationSummaryServiceImpl({ storage, modelProvider, spaceId, user });
};

class ConversationSummaryServiceImpl implements ConversationSummaryService {
  private readonly spaceId: string;
  private readonly modelProvider: ModelProvider;
  private readonly storage: ConversationStorage;
  private readonly user: UserIdAndName;

  constructor({
    storage,
    user,
    spaceId,
    modelProvider,
  }: {
    storage: ConversationStorage;
    user: UserIdAndName;
    spaceId: string;
    modelProvider: ModelProvider;
  }) {
    this.spaceId = spaceId;
    this.storage = storage;
    this.modelProvider = modelProvider;
    this.user = user;
  }

  async get(conversationId: string): Promise<ConversationSummary> {
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

  async create(conversation: Conversation): Promise<ConversationSummary> {
    const now = new Date();
    const id = conversation.id;

    const summary = await summarizeConversation({
      conversation,
      model: await this.modelProvider.getDefaultModel(),
    });

    const attributes = createConversationSummary({
      conversation,
      summary,
      user: this.user,
      spaceId: this.spaceId,
      createdAt: now,
    });

    await this.storage.getClient().index({
      id,
      document: attributes,
    });

    return this.get(id);
  }

  async update(conversation: Conversation): Promise<ConversationSummary> {
    const { id: conversationId } = conversation;
    const now = new Date();
    const document = await this._get(conversation.id);
    if (!document) {
      throw createConversationNotFoundError({ conversationId });
    }

    if (!hasAccess({ conversation: document, user: this.user })) {
      throw createConversationNotFoundError({ conversationId });
    }

    const storedConversation = fromEs(document);
    const updatedConversation = updateConversation({
      conversation: storedConversation,
      update: conversation,
      updateDate: now,
      space: this.spaceId,
    });
    const attributes = toEs(updatedConversation, this.spaceId);

    await this.storage.getClient().index({
      id: conversation.id,
      document: attributes,
    });

    return this.get(conversation.id);
  }

  async search(options: SummarySearchParams): Promise<ConversationSummary[]> {
    const { term, keywords = [], questions = [] } = options;

    const response = await this.storage.getClient().search({
      track_total_hits: false,
      size: 5,
      query: {
        bool: {
          filter: [
            createSpaceDslFilter(this.spaceId),
            {
              term: this.user.username
                ? { user_name: this.user.username }
                : { user_id: this.user.id },
            },
          ],
          must: [
            {
              match: {
                summary: {
                  query: term,
                  boost: 2,
                },
              },
            },
            ...(keywords.length > 0
              ? [
                  {
                    match: {
                      summary: {
                        query: keywords.join(' '),
                        boost: 1,
                      },
                    },
                  },
                ]
              : []),
          ],
        },
      },
    });

    return response.hits.hits.map((hit) => fromEs(hit as Document));
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
          filter: [createSpaceDslFilter(this.spaceId), { term: { _id: conversationId } }],
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

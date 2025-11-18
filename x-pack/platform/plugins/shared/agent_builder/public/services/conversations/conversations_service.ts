/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { Conversation, ConversationWithoutRounds } from '@kbn/agent-builder-common';
import type {
  ListConversationsResponse,
  DeleteConversationResponse,
  RenameConversationResponse,
} from '../../../common/http_api/conversations';
import type {
  ConversationListOptions,
  ConversationGetOptions,
  ConversationDeleteOptions,
} from '../../../common/conversations';
import { publicApiPath, internalApiPath } from '../../../common/constants';

export class ConversationsService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list({ agentId }: ConversationListOptions): Promise<ConversationWithoutRounds[]> {
    const response = await this.http.get<ListConversationsResponse>(
      `${publicApiPath}/conversations`,
      {
        query: {
          agent_id: agentId,
        },
      }
    );
    return response.results;
  }

  async get({ conversationId }: ConversationGetOptions) {
    return await this.http.get<Conversation>(`${publicApiPath}/conversations/${conversationId}`);
  }

  async delete({ conversationId }: ConversationDeleteOptions) {
    return await this.http.delete<DeleteConversationResponse>(
      `${publicApiPath}/conversations/${conversationId}`
    );
  }

  async rename({ conversationId, title }: { conversationId: string; title: string }) {
    return await this.http.post<RenameConversationResponse>(
      `${internalApiPath}/conversations/${conversationId}/_rename`,
      {
        body: JSON.stringify({ title }),
      }
    );
  }
}

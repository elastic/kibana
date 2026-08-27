/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { FeedbackChipId } from '@kbn/agent-builder-common';
import type {
  ListConversationsResponseItem,
  GetConversationResponse,
  ListConversationsResponse,
  DeleteConversationResponse,
  MarkPinnedConversationResponse,
  MarkReadConversationResponse,
  RenameConversationResponse,
} from '../../../common/http_api/conversations';
import type { ReadWorkspaceFileResponse } from '../../../common/http_api/workspace_files';
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

  async list({ agentId }: ConversationListOptions): Promise<ListConversationsResponseItem[]> {
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
    return await this.http.get<GetConversationResponse>(
      `${publicApiPath}/conversations/${conversationId}`
    );
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

  async updateReadStatus({
    conversationId,
    read,
  }: {
    conversationId: string;
    read: boolean;
  }): Promise<MarkReadConversationResponse> {
    return await this.http.post<MarkReadConversationResponse>(
      `${internalApiPath}/conversations/${conversationId}/_mark_read`,
      { body: JSON.stringify({ read }) }
    );
  }

  async submitRoundFeedback({
    conversationId,
    roundId,
    vote,
    chips,
    comment,
  }: {
    conversationId: string;
    roundId: string;
    vote: 'up' | 'down' | null;
    chips?: FeedbackChipId[];
    comment?: string;
  }): Promise<void> {
    await this.http.post(
      `${internalApiPath}/conversations/${conversationId}/rounds/${roundId}/_feedback`,
      { body: JSON.stringify({ vote, chips, comment }) }
    );
  }

  async updatePinnedStatus({
    conversationId,
    pinned,
  }: {
    conversationId: string;
    pinned: boolean;
  }): Promise<MarkPinnedConversationResponse> {
    return await this.http.post<MarkPinnedConversationResponse>(
      `${internalApiPath}/conversations/${conversationId}/_set_pinned`,
      { body: JSON.stringify({ pinned }) }
    );
  }

  async readWorkspaceFile({
    conversationId,
    path,
  }: {
    conversationId: string;
    path: string;
  }): Promise<ReadWorkspaceFileResponse> {
    return await this.http.get<ReadWorkspaceFileResponse>(
      `${internalApiPath}/conversations/${conversationId}/files`,
      { query: { path } }
    );
  }
}

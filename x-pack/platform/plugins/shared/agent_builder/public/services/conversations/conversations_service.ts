/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type HttpSetup, buildPath } from '@kbn/core-http-browser';
import type { FeedbackChipId } from '@kbn/agent-builder-common';
import type {
  GetConversationResponse,
  ListConversationsResponse,
  DeleteConversationResponse,
  MarkPinnedConversationResponse,
  MarkReadConversationResponse,
  RenameConversationResponse,
  UpdateConversationAccessControlRequestBody,
  UpdateConversationAccessControlResponse,
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

  async list({
    agentId,
    page,
    perPage,
    sortOrder,
    pinned,
  }: ConversationListOptions): Promise<ListConversationsResponse> {
    return await this.http.get<ListConversationsResponse>(
      buildPath(`${publicApiPath}/conversations`),
      {
        query: {
          agent_id: agentId,
          page,
          per_page: perPage,
          sort_order: sortOrder,
          pinned,
        },
      }
    );
  }

  async get({ conversationId }: ConversationGetOptions) {
    return await this.http.get<GetConversationResponse>(
      buildPath(`${publicApiPath}/conversations/{conversationId}`, { conversationId })
    );
  }

  async delete({ conversationId }: ConversationDeleteOptions) {
    return await this.http.delete<DeleteConversationResponse>(
      buildPath(`${publicApiPath}/conversations/{conversationId}`, { conversationId })
    );
  }

  async rename({ conversationId, title }: { conversationId: string; title: string }) {
    return await this.http.post<RenameConversationResponse>(
      buildPath(`${internalApiPath}/conversations/{conversationId}/_rename`, { conversationId }),
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
      buildPath(`${internalApiPath}/conversations/{conversationId}/_mark_read`, { conversationId }),
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
      buildPath(`${internalApiPath}/conversations/{conversationId}/rounds/{roundId}/_feedback`, {
        conversationId,
        roundId,
      }),
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
      buildPath(`${internalApiPath}/conversations/{conversationId}/_set_pinned`, {
        conversationId,
      }),
      { body: JSON.stringify({ pinned }) }
    );
  }

  async updateAccessControl({
    conversationId,
    accessControl,
  }: {
    conversationId: string;
    accessControl: UpdateConversationAccessControlRequestBody;
  }): Promise<UpdateConversationAccessControlResponse> {
    return await this.http.put<UpdateConversationAccessControlResponse>(
      `${publicApiPath}/conversations/${conversationId}/access_control`,
      {
        body: JSON.stringify(accessControl),
      }
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
      buildPath(`${internalApiPath}/conversations/{conversationId}/files`, { conversationId }),
      { query: { path } }
    );
  }
}

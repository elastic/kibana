/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { Conversation, ConversationWithoutRounds } from '@kbn/onechat-common';
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

  /**
   * Delete a conversation-level attachment.
   * @param permanent - If true, permanently removes the attachment. Only allowed for attachments not referenced in any round.
   */
  async deleteAttachment({
    conversationId,
    attachmentId,
    permanent = false,
  }: {
    conversationId: string;
    attachmentId: string;
    permanent?: boolean;
  }) {
    return await this.http.delete<{ success: boolean; permanent: boolean }>(
      `${publicApiPath}/conversations/${conversationId}/attachments/${attachmentId}`,
      {
        query: permanent ? { permanent: true } : undefined,
      }
    );
  }

  /**
   * Restore a previously deleted conversation-level attachment.
   */
  async restoreAttachment({
    conversationId,
    attachmentId,
  }: {
    conversationId: string;
    attachmentId: string;
  }) {
    return await this.http.post<{ success: boolean }>(
      `${publicApiPath}/conversations/${conversationId}/attachments/${attachmentId}/_restore`
    );
  }

  /**
   * Update a conversation-level attachment (creates a new version).
   */
  async updateAttachment({
    conversationId,
    attachmentId,
    data,
    description,
  }: {
    conversationId: string;
    attachmentId: string;
    data: unknown;
    description?: string;
  }) {
    return await this.http.put<{ attachment: unknown; new_version: unknown }>(
      `${publicApiPath}/conversations/${conversationId}/attachments/${attachmentId}`,
      {
        body: JSON.stringify({ data, description }),
      }
    );
  }

  /**
   * Create a new conversation-level attachment.
   */
  async createAttachment({
    conversationId,
    type,
    data,
    description,
    hidden,
  }: {
    conversationId: string;
    type: string;
    data: unknown;
    description?: string;
    hidden?: boolean;
  }) {
    return await this.http.post<{ id: string; type: string; current_version: number }>(
      `${publicApiPath}/conversations/${conversationId}/attachments`,
      {
        body: JSON.stringify({ type, data, description, hidden }),
      }
    );
  }

  /**
   * Rename a conversation-level attachment (update description without creating a new version).
   */
  async renameAttachment({
    conversationId,
    attachmentId,
    description,
  }: {
    conversationId: string;
    attachmentId: string;
    description: string;
  }) {
    return await this.http.patch<{ success: boolean; attachment: unknown }>(
      `${publicApiPath}/conversations/${conversationId}/attachments/${attachmentId}`,
      {
        body: JSON.stringify({ description }),
      }
    );
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type {
  ConversationRoundFeedback,
  FeedbackChipId,
} from '@kbn/agent-builder-common/chat/conversation';

export const feedbackIndexName = chatSystemIndex('conversation_feedback');

// One feedback doc per execution; a conversation rarely exceeds single digits of rounds.
const MAX_FEEDBACK_PER_CONVERSATION = 100;

export interface FeedbackDocument {
  conversation_id: string;
  execution_id: string;
  agent_id?: string;
  vote: 'up' | 'down';
  chips?: FeedbackChipId[];
  comment?: string;
  submitted_at: string;
  connector_id?: string;
  model?: string;
}

/** Stable doc id: one feedback record per execution per conversation. */
const feedbackDocId = (conversationId: string, executionId: string) =>
  `${conversationId}::${executionId}`;

export class FeedbackClient {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  async write(
    conversationId: string,
    executionId: string,
    data: ConversationRoundFeedback & { agent_id?: string }
  ): Promise<void> {
    const { agent_id, ...feedbackFields } = data;
    await this.esClient.index({
      index: feedbackIndexName,
      id: feedbackDocId(conversationId, executionId),
      document: {
        conversation_id: conversationId,
        execution_id: executionId,
        ...(agent_id ? { agent_id } : {}),
        ...feedbackFields,
      } satisfies FeedbackDocument,
      refresh: 'wait_for',
    });
  }

  async delete(conversationId: string, executionId: string): Promise<void> {
    try {
      await this.esClient.delete({
        index: feedbackIndexName,
        id: feedbackDocId(conversationId, executionId),
        refresh: 'wait_for',
      });
    } catch (err) {
      if (err?.meta?.statusCode === 404 || err?.statusCode === 404) {
        return;
      }
      throw err;
    }
  }

  async getByConversation(
    conversationId: string
  ): Promise<Record<string, ConversationRoundFeedback> | undefined> {
    let response;
    try {
      response = await this.esClient.search<FeedbackDocument>({
        index: feedbackIndexName,
        size: MAX_FEEDBACK_PER_CONVERSATION,
        query: { term: { conversation_id: conversationId } },
      });
    } catch (err) {
      if (err?.meta?.statusCode === 404 || err?.statusCode === 404) {
        return undefined;
      }
      this.logger.error(`Failed to fetch feedback for conversation ${conversationId}: ${err}`);
      return undefined;
    }

    const { hits } = response.hits;
    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    if (total > MAX_FEEDBACK_PER_CONVERSATION) {
      this.logger.warn(
        `Conversation ${conversationId} has ${total} feedback docs; only the first ${MAX_FEEDBACK_PER_CONVERSATION} are returned`
      );
    }

    if (hits.length === 0) return undefined;

    const feedback: Record<string, ConversationRoundFeedback> = {};
    for (const hit of hits) {
      const src = hit._source;
      if (!src) continue;
      feedback[src.execution_id] = {
        vote: src.vote,
        chips: src.chips ?? [],
        comment: src.comment ?? '',
        submitted_at: src.submitted_at,
        connector_id: src.connector_id,
        model: src.model,
      };
    }
    return Object.keys(feedback).length ? feedback : undefined;
  }
}

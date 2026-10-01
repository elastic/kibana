/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type {
  ConversationRoundFeedback,
  FeedbackChipId,
} from '@kbn/agent-builder-common/chat/conversation';

export const feedbackIndexName = chatSystemIndex('conversation_feedback');

const feedbackStorageSettings = {
  name: feedbackIndexName,
  schema: {
    properties: {
      conversation_id: types.keyword({}),
      execution_id: types.keyword({}),
      agent_id: types.keyword({}),
      vote: types.keyword({}),
      chips: types.keyword({}),
      comment: types.text({}),
      submitted_at: types.date({}),
      connector_id: types.keyword({}),
      model: types.keyword({}),
    },
  },
} satisfies IndexStorageSettings;

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

export type FeedbackStorage = StorageIndexAdapter<
  typeof feedbackStorageSettings,
  FeedbackDocument
>;

export const createFeedbackStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): FeedbackStorage => {
  return new StorageIndexAdapter<typeof feedbackStorageSettings, FeedbackDocument>(
    esClient,
    logger,
    feedbackStorageSettings
  );
};

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
        size: 100,
        query: { term: { conversation_id: conversationId } },
      });
    } catch (err) {
      if (err?.meta?.statusCode === 404 || err?.statusCode === 404) {
        return undefined;
      }
      this.logger.warn(`Failed to fetch feedback for conversation ${conversationId}: ${err}`);
      return undefined;
    }

    const hits = response.hits.hits;
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

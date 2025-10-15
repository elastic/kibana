/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { chatSystemIndex } from '@kbn/onechat-server';

export const conversationSummaryIndexName = chatSystemIndex('conversation-summaries');

const storageSettings = {
  name: conversationSummaryIndexName,
  schema: {
    properties: {
      user_id: types.keyword({}),
      user_name: types.keyword({}),
      agent_id: types.keyword({}),
      space: types.keyword({}),
      title: types.text({}),
      created_at: types.date({}),
      updated_at: types.date({}),
      semantic_summary: types.semantic_text({}),
      structured_data: types.object({
        dynamic: false,
        properties: {
          title: types.text({}),
          discussion_summary: types.text({}),
          user_intent: types.text({}),
          key_topics: types.text({}),
          outcome_and_decisions: types.text({}),
          unanswered_questions: types.text({}),
          agent_actions: types.text({}),
          entities: types.nested({
            properties: {
              type: types.keyword(),
              name: types.keyword(),
            },
          }),
        },
      }),
    },
  },
} satisfies IndexStorageSettings;

export interface ConversationSummaryProperties {
  user_id: string;
  user_name: string;
  agent_id: string;
  space: string;
  title: string;
  created_at: string;
  updated_at: string;

  semantic_summary: string;

  structured_data: {
    title: string;
    discussion_summary: string;
    user_intent: string;
    key_topics?: string[];
    outcomes_and_decisions?: string[];
    unanswered_questions?: string[];
    agent_actions?: string[];
    entities?: {
      type: string;
      name: string;
    }[];
  };
}

export type ConversationSummaryStorageSettings = typeof storageSettings;

export type ConversationStorage = StorageIndexAdapter<
  ConversationSummaryStorageSettings,
  ConversationSummaryProperties
>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): ConversationStorage => {
  return new StorageIndexAdapter<ConversationSummaryStorageSettings, ConversationSummaryProperties>(
    esClient,
    logger,
    storageSettings
  );
};

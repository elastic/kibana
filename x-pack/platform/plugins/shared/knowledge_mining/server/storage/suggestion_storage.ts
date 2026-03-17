/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import type { SuggestionAction, SuggestionStatus, MemoryType } from '../../common/types';

const suggestionStorageSettings = {
  name: '.kibana-knowledge-mining-suggestions',
  schema: {
    properties: {
      action: types.keyword({}),
      target_memory_id: types.keyword({}),
      target_path: types.keyword({}),
      proposed_title: types.text({}),
      proposed_content: types.text({}),
      proposed_path: types.keyword({}),
      proposed_memory_type: types.keyword({}),
      proposed_tags: types.keyword({}),
      reasoning: types.text({}),
      status: types.keyword({}),
      source_conversation_id: types.keyword({}),
      source_round_summary: types.text({}),
      space: types.keyword({}),
      created_at: types.date({}),
      reviewed_at: types.date({}),
      reviewed_by: types.keyword({}),
    },
  },
} satisfies IndexStorageSettings;

export interface SuggestionProperties {
  action: SuggestionAction;
  target_memory_id?: string;
  target_path?: string;
  proposed_title: string;
  proposed_content: string;
  proposed_path: string;
  proposed_memory_type?: MemoryType;
  proposed_tags: string[];
  reasoning?: string;
  status: SuggestionStatus;
  source_conversation_id?: string;
  source_round_summary?: string;
  space: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export type SuggestionStorageSettings = typeof suggestionStorageSettings;

export type SuggestionStorage = StorageIndexAdapter<
  SuggestionStorageSettings,
  SuggestionProperties
>;

export const createSuggestionStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): SuggestionStorage => {
  return new StorageIndexAdapter<SuggestionStorageSettings, SuggestionProperties>(
    esClient,
    logger,
    suggestionStorageSettings
  );
};

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
import type { MemoryQuestion } from './types';

export const questionsIndexName = chatSystemIndex('memquestions');

const storageSettings = {
  name: questionsIndexName,
  schema: {
    properties: {
      id: types.keyword({}),
      question: types.text({}),
      category: types.keyword({}),
      related_entries: types.keyword({}),
      context: types.text({}),
      status: types.keyword({}),
      answer: types.text({}),
      created_at: types.date({}),
      created_by: types.keyword({}),
    },
  },
} satisfies IndexStorageSettings;

export type QuestionsStorageSettings = typeof storageSettings;

export type QuestionsStorage = StorageIndexAdapter<QuestionsStorageSettings, MemoryQuestion>;

export const createQuestionsStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): QuestionsStorage => {
  return new StorageIndexAdapter<QuestionsStorageSettings, MemoryQuestion>(
    esClient,
    logger,
    storageSettings
  );
};

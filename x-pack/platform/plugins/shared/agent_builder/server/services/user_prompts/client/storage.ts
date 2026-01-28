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

export const userPromptsIndexName = chatSystemIndex('user-prompts');

const storageSettings = {
  name: userPromptsIndexName,
  schema: {
    properties: {
      id: types.keyword({}),
      name: types.keyword({}),
      content: types.text({}),
      space: types.keyword({}),
      created_at: types.date({}),
      updated_at: types.date({}),
      created_by: types.keyword({}),
      updated_by: types.keyword({}),
    },
  },
} satisfies IndexStorageSettings;

export interface UserPromptProperties {
  id: string;
  name: string;
  content: string;
  space: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export type UserPromptStorageSettings = typeof storageSettings;

export type UserPromptStorage = StorageIndexAdapter<
  UserPromptStorageSettings,
  UserPromptProperties
>;

export const createStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): UserPromptStorage => {
  return new StorageIndexAdapter<UserPromptStorageSettings, UserPromptProperties>(
    esClient,
    logger,
    storageSettings
  );
};

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
import type { SmlCrawlerStateDocument } from './types';

export const smlCrawlerStateIndexName = chatSystemIndex('sml-crawler-state');

const storageSettings = {
  name: smlCrawlerStateIndexName,
  schema: {
    properties: {
      attachment_id: types.keyword({}),
      attachment_type: types.keyword({}),
      spaces: types.keyword({}),
      created_at: types.date({}),
      updated_at: types.date({}),
      update_action: types.keyword({}),
    },
  },
} satisfies IndexStorageSettings;

export type SmlCrawlerStateStorageSettings = typeof storageSettings;

export type SmlCrawlerStateStorage = StorageIndexAdapter<
  SmlCrawlerStateStorageSettings,
  SmlCrawlerStateDocument
>;

export const createSmlCrawlerStateStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): SmlCrawlerStateStorage => {
  return new StorageIndexAdapter<SmlCrawlerStateStorageSettings, SmlCrawlerStateDocument>(
    esClient,
    logger,
    storageSettings
  );
};

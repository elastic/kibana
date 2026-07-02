/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { chatSystemIndex } from '../../../common/indices';
import type { CeCrawlerStateDocument } from './types';

export const ceCrawlerStateIndexName = chatSystemIndex('sml-crawler-state');

const storageSettings = {
  name: ceCrawlerStateIndexName,
  schema: {
    properties: {
      origin_id: types.keyword({}),
      type_id: types.keyword({}),
      spaces: types.keyword({}),
      created_at: types.date({}),
      updated_at: types.date({}),
      update_action: types.keyword({}),
      last_crawled_at: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export type CeCrawlerStateStorageSettings = typeof storageSettings;

export type CeCrawlerStateStorage = StorageIndexAdapter<
  CeCrawlerStateStorageSettings,
  CeCrawlerStateDocument
>;

export const createCeCrawlerStateStorage = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}): CeCrawlerStateStorage => {
  return new StorageIndexAdapter<CeCrawlerStateStorageSettings, CeCrawlerStateDocument>(
    esClient,
    logger,
    storageSettings
  );
};

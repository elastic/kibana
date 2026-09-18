/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndexStorageSettings, IStorageClient } from '@kbn/storage-adapter';
import { StorageIndexAdapter, types } from '@kbn/storage-adapter';
import { IMPACT_INDEX_NAME } from '../../../common/impact/constants';
import type { Impact } from '../../../common/impact/impact';

const storageSettings = {
  name: IMPACT_INDEX_NAME,
  schema: {
    properties: {
      spaceId: types.keyword({}),
      conversationId: types.keyword({}),
      // Keyword so pill aggregation and `entityIds.includes` filtering stay cheap.
      entityIds: types.keyword({}),
      createdAt: types.date({}),
      createdBy: types.object({
        properties: {
          username: types.keyword({}),
          fullName: types.keyword({}),
          email: types.keyword({}),
          profileUid: types.keyword({}),
        },
      }),
    },
  },
} satisfies IndexStorageSettings;

export type ImpactStorageSettings = typeof storageSettings;

/** Stored shape: the id lives in `_id`, everything else in `_source`. */
export type ImpactDocument = Omit<Impact, 'id'>;

export type ImpactStorageClient = IStorageClient<ImpactStorageSettings, ImpactDocument>;

export const createImpactStorageClient = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): ImpactStorageClient => {
  const adapter = new StorageIndexAdapter<ImpactStorageSettings, ImpactDocument>(
    esClient,
    logger,
    storageSettings
  );
  return adapter.getClient();
};

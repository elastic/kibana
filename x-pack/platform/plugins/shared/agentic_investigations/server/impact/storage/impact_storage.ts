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

/**
 * Mapping changes must stay additive: the adapter applies them in place with `putMapping`.
 * Evidence is stored but not indexed (`enabled: false`); nothing filters on chart points.
 */
export const impactStorageSettings = {
  name: IMPACT_INDEX_NAME,
  schema: {
    properties: {
      spaceId: types.keyword({}),
      conversationId: types.keyword({}),
      summary: types.text({}),
      evidence: types.object({ enabled: false }),
      // Nested so a filter can match `entities.id` or `entities.featureId` without
      // scanning a flattened blob. Pill filtering stays client-side for the MVP.
      entities: types.nested({
        properties: {
          id: types.keyword({}),
          name: types.keyword({}),
          type: types.keyword({}),
          featureId: types.keyword({}),
          streamName: types.keyword({}),
          evidence: types.object({ enabled: false }),
        },
      }),
      createdAt: types.date({}),
      updatedAt: types.date({}),
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

export type ImpactStorageSettings = typeof impactStorageSettings;

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
    impactStorageSettings
  );
  return adapter.getClient();
};

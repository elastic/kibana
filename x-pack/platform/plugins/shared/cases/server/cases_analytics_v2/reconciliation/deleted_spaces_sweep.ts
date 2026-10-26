/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ACTIVITY_INDEX_NAME, ATTACHMENTS_INDEX_NAME, CASE_INDEX_NAME } from '../constants';

const ANALYTICS_INDICES = [CASE_INDEX_NAME, ACTIVITY_INDEX_NAME, ATTACHMENTS_INDEX_NAME];
const PAGE_SIZE = 1000;

interface SweepDeletedSpacesArgs {
  esClient: ElasticsearchClient;
  /** Must be created with the hidden `space` type included. */
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  signal: AbortSignal;
}

/**
 * Deletes analytics docs of deleted spaces. Space deletion removes cases SOs by
 * namespace, bypassing the cases service and its analytics cascade deletes.
 */
export const sweepDeletedSpaces = async ({
  esClient,
  savedObjectsClient,
  logger,
  signal,
}: SweepDeletedSpacesArgs): Promise<void> => {
  // Read indexed ids before existing spaces, so a space created mid-sweep is
  // never mistaken for a deleted one.
  const indexedSpaceIds = await getIndexedSpaceIds(esClient, signal);
  if (indexedSpaceIds.length === 0 || signal.aborted) return;

  const existingSpaceIds = await getExistingSpaceIds(savedObjectsClient);
  if (existingSpaceIds.size === 0) {
    logger.warn('cases-analyticsV2: no spaces found; skipping the deleted-spaces sweep');
    return;
  }

  const deletedSpaceIds = indexedSpaceIds.filter(
    (spaceId) => spaceId !== DEFAULT_SPACE_ID && !existingSpaceIds.has(spaceId)
  );
  if (deletedSpaceIds.length === 0 || signal.aborted) return;

  const { deleted } = await esClient.deleteByQuery({
    index: ANALYTICS_INDICES,
    ignore_unavailable: true,
    conflicts: 'proceed',
    query: { terms: { space_id: deletedSpaceIds } },
  });

  logger.info(
    `cases-analyticsV2: deleted ${deleted} analytics documents of deleted spaces [${deletedSpaceIds.join(
      ', '
    )}]`
  );
};

const getIndexedSpaceIds = async (
  esClient: ElasticsearchClient,
  signal: AbortSignal
): Promise<string[]> => {
  const spaceIds: string[] = [];
  let after: estypes.AggregationsCompositeAggregateKey | undefined;

  do {
    const response = await esClient.search<
      unknown,
      { space_ids: estypes.AggregationsCompositeAggregate }
    >({
      index: ANALYTICS_INDICES,
      ignore_unavailable: true,
      size: 0,
      aggs: {
        space_ids: {
          composite: {
            size: PAGE_SIZE,
            sources: [{ space_id: { terms: { field: 'space_id' } } }],
            after,
          },
        },
      },
    });

    const aggregation = response.aggregations?.space_ids;
    const aggregationBuckets = aggregation?.buckets;
    const buckets = Array.isArray(aggregationBuckets) ? aggregationBuckets : [];
    spaceIds.push(...buckets.map(({ key }) => String(key.space_id)));
    after = aggregation?.after_key;
  } while (after != null && !signal.aborted);

  return spaceIds;
};

const getExistingSpaceIds = async (
  savedObjectsClient: SavedObjectsClientContract
): Promise<Set<string>> => {
  const spaceIds = new Set<string>();
  const finder = savedObjectsClient.createPointInTimeFinder({
    type: 'space',
    perPage: PAGE_SIZE,
  });

  try {
    for await (const { saved_objects: spaces } of finder.find()) {
      spaces.forEach(({ id }) => spaceIds.add(id));
    }
  } finally {
    await finder.close();
  }

  return spaceIds;
};

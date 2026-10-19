/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One-time repair shipped in 9.6 alongside the incremental-id task fix that
 * mirrors newly assigned ids to `.cases`. Before that fix, a case whose
 * `.cases` doc was written before it was numbered never received
 * `case.incremental_id`, because the id is applied with a raw SO update that
 * doesn't bump the `attributes.updated_at` reconciliation filters on.
 *
 * Runs from the reconciliation tick until one pass completes. Remove in 9.7:
 * delete this folder, and drop its call and the
 * `incremental_id_backfill_completed` state field from `../reconciliation`.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type {
  ElasticsearchClient,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import { CASE_INDEX_NAME } from '../constants';
import type { CasesAnalyticsV2WriterContract } from '../writer';

const PAGE_SIZE = 250;

export interface RunIncrementalIdBackfillDeps {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  writer: CasesAnalyticsV2WriterContract;
  logger: Logger;
  signal?: AbortSignal;
  /**
   * Epoch ms after which no new page is started. The pass returns
   * `completed: false` instead of throwing, so the caller can persist its
   * other progress and resume on a later run.
   */
  deadline?: number;
}

/**
 * Re-emits every `.cases` doc that is missing `case.incremental_id` but whose
 * case SO now has one. Only the affected docs are touched, unlike a full
 * reset. Cases that are still unnumbered are skipped; the incremental-id task
 * mirrors them when it numbers them.
 */
export async function runIncrementalIdBackfill({
  esClient,
  savedObjectsClient,
  writer,
  logger,
  signal,
  deadline,
}: RunIncrementalIdBackfillDeps): Promise<{ repaired: number; completed: boolean }> {
  let repaired = 0;
  let searchAfter: SortResults | undefined;

  while (true) {
    if (signal?.aborted) {
      throw new Error(
        `cases-analyticsV2: incremental id backfill aborted after repaired=${repaired}`
      );
    }

    if (deadline != null && Date.now() >= deadline) {
      logger.info(
        `cases-analyticsV2: incremental id backfill paused at its time budget after repaired=${repaired}; resuming on the next run`
      );
      return { repaired, completed: false };
    }

    const { hits } = await esClient.search<{ space_id?: string }>({
      index: CASE_INDEX_NAME,
      ignore_unavailable: true,
      size: PAGE_SIZE,
      _source: ['space_id'],
      query: { bool: { must_not: [{ exists: { field: 'case.incremental_id' } }] } },
      sort: [{ 'case.id': 'asc' }],
      ...(searchAfter ? { search_after: searchAfter } : {}),
    });
    const page = hits.hits;

    if (page.length === 0) {
      break;
    }

    const { saved_objects: savedObjects } =
      await savedObjectsClient.bulkGet<CasePersistedAttributes>(
        page.map((hit) => ({
          type: CASE_SAVED_OBJECT,
          // `.cases` docs are indexed with the case SO id as `_id`.
          id: hit._id as string,
          namespaces: [hit._source?.space_id ?? 'default'],
        }))
      );
    const numbered = savedObjects.filter(
      (so): so is SavedObject<CasePersistedAttributes> =>
        !isSavedObjectErrorResult(so) && so.attributes.incremental_id != null
    );

    if (numbered.length > 0) {
      await writer.bulkUpsertCasesAwait(numbered);
      repaired += numbered.length;
    }

    searchAfter = page[page.length - 1].sort;

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  logger.info(`cases-analyticsV2: incremental id backfill repaired=${repaired}`);

  return { repaired, completed: true };
}

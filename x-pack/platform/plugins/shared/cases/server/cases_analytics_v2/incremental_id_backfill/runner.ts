/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Repairs `.cases` docs missing `case.incremental_id`. The id is applied with
 * a raw SO update that doesn't bump the `attributes.updated_at` reconciliation
 * filters on, so the cursor walks never re-emit a case just because it was
 * numbered.
 *
 * The incremental-id task mirrors newly numbered cases to `.cases`, but that
 * write isn't guaranteed (exhausted retries, a restart between numbering and
 * mirroring, a no-op writer during start, a reconciliation tick overwriting
 * the doc with an older snapshot, an older node numbering cases during a
 * rolling upgrade). This pass runs on every reconciliation tick as the
 * backstop for all of those, and also repairs docs written before the mirror
 * existed.
 */

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
  /**
   * `case.id` to resume after, from a previous run's `resumeAfter`. Docs that
   * are skipped rather than repaired stay in the query, so without this a
   * time-boxed pass could re-read the same prefix every run.
   */
  startAfter?: string;
}

export interface RunIncrementalIdBackfillResult {
  repaired: number;
  completed: boolean;
  /** Set when `completed` is false: the `case.id` to pass as `startAfter` next run. */
  resumeAfter?: string;
}

/**
 * Re-emits every `.cases` doc that is missing `case.incremental_id` but whose
 * case SO now has one. Only the affected docs are touched, unlike a full
 * reset. Cases that are still unnumbered are skipped; the incremental-id task
 * mirrors them when it numbers them, and a later pass catches any it misses.
 */
export async function runIncrementalIdBackfill({
  esClient,
  savedObjectsClient,
  writer,
  logger,
  signal,
  deadline,
  startAfter,
}: RunIncrementalIdBackfillDeps): Promise<RunIncrementalIdBackfillResult> {
  let repaired = 0;
  let searchAfter = startAfter;

  const throwIfAborted = () => {
    if (signal?.aborted) {
      throw new Error(
        `cases-analyticsV2: incremental id backfill aborted after repaired=${repaired}`
      );
    }
  };

  while (true) {
    throwIfAborted();

    if (deadline != null && Date.now() >= deadline) {
      logger.info(
        `cases-analyticsV2: incremental id backfill paused at its time budget after repaired=${repaired}; resuming on the next run`
      );
      return { repaired, completed: false, resumeAfter: searchAfter };
    }

    const {
      hits,
      timed_out: timedOut,
      _shards: shards,
    } = await esClient.search<{ space_id?: string }>(
      {
        index: CASE_INDEX_NAME,
        ignore_unavailable: true,
        size: PAGE_SIZE,
        _source: ['space_id'],
        query: { bool: { must_not: [{ exists: { field: 'case.incremental_id' } }] } },
        sort: [{ 'case.id': 'asc' }],
        ...(searchAfter != null ? { search_after: [searchAfter] } : {}),
      },
      { signal }
    );

    // A partial page would otherwise read as the end of the index and
    // complete the pass with cases left unrepaired.
    if (timedOut || shards?.failed) {
      throw new Error(
        `cases-analyticsV2: incremental id backfill got an incomplete search response after repaired=${repaired}`
      );
    }

    throwIfAborted();

    const page = hits.hits;

    if (page.length === 0) {
      break;
    }

    const lastSortValue = page[page.length - 1].sort?.[0];
    if (typeof lastSortValue !== 'string') {
      throw new Error(
        `cases-analyticsV2: incremental id backfill got a non-string case.id sort value after repaired=${repaired}`
      );
    }

    // `.cases` docs are indexed with the case SO id as `_id`.
    const toRead = page.flatMap((hit) =>
      hit._id != null
        ? [
            {
              type: CASE_SAVED_OBJECT,
              id: hit._id,
              namespaces: [hit._source?.space_id ?? 'default'],
            },
          ]
        : []
    );

    if (toRead.length > 0) {
      const { saved_objects: savedObjects } =
        await savedObjectsClient.bulkGet<CasePersistedAttributes>(toRead);
      const numbered = savedObjects.filter(
        (so): so is SavedObject<CasePersistedAttributes> =>
          !isSavedObjectErrorResult(so) && so.attributes.incremental_id != null
      );

      if (numbered.length > 0) {
        await writer.bulkUpsertCasesAwait(numbered);
        repaired += numbered.length;
      }
    }

    searchAfter = lastSortValue;

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  if (repaired > 0) {
    logger.info(`cases-analyticsV2: incremental id backfill repaired=${repaired}`);
  } else {
    logger.debug('cases-analyticsV2: incremental id backfill found nothing to repair');
  }

  return { repaired, completed: true };
}

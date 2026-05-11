/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import { nodeBuilder } from '@kbn/es-query';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { CasesAnalyticsV2WriterContract } from '../writer';

/**
 * Maximum number of case SOs fetched per ES round-trip. Modest enough that
 * Task Manager's task-runtime budget isn't a concern even on cases with
 * heavy `extended_fields` payloads.
 */
const PAGE_SIZE = 100;

export interface RunReconciliationDeps {
  /** Internal SO client (no request scope). Used to walk every case across every space. */
  savedObjectsClient: SavedObjectsClientContract;
  writer: CasesAnalyticsV2WriterContract;
  logger: Logger;
  /**
   * ISO timestamp from the previous successful tick — only cases updated AFTER
   * this point are walked. `undefined` on the first ever run; in that case
   * the runner walks every case (i.e. acts as a backfill). Operators who want
   * to trigger an explicit backfill use the `/reset` endpoint, which clears
   * the task state and forces this code path.
   */
  lastRunAt: string | undefined;
}

export interface RunReconciliationResult {
  /** ISO timestamp to persist as the next `last_run_at`. */
  newLastRunAt: string;
  /** Count of cases re-emitted during the tick. Logged + reported via /state. */
  processed: number;
}

/**
 * Reconciliation tick. Walks every case saved object updated since the last
 * successful tick and re-emits its analytics doc via the writer.
 *
 * **Why this exists.** The primary write path (the SO-service hooks added in
 * commit 4) is fire-and-forget — errors are logged and swallowed. That's
 * correct behaviour (analytics must never block the user's request), but it
 * means a transient ES blip can silently leave a case un-mirrored. This task
 * is the durability backstop: on every tick we re-walk recent activity, and
 * `writer.upsertCase` is idempotent (last-write-wins on the same `_id`), so
 * any missed updates get repaired without the operator noticing.
 *
 * **Why PIT + searchAfter** (rather than page+perPage). The SO `find` API
 * with `page` has an effective ~10k-result limit (ES's
 * `index.max_result_window`). For incremental ticks the result set is small,
 * but the first run from an empty cursor (backfill scenario) can sweep
 * everything — PIT + searchAfter has no such cap.
 *
 * **Watermark advancement.** On successful drain, the watermark advances to
 * the tick start time. Any case updated *during* the tick will land in the
 * next tick's window (since its `updated_at` > tickStartedAt). Caller is
 * responsible for persisting the result.
 */
export async function runReconciliation({
  savedObjectsClient,
  writer,
  logger,
  lastRunAt,
}: RunReconciliationDeps): Promise<RunReconciliationResult> {
  // Capture the wall-clock at tick start. We persist this as the new cursor on
  // a successful drain so the next tick sees only cases updated *after* this
  // moment. Captured before any I/O so cases updated while the tick is
  // running fall into the next window, never get skipped.
  const tickStartedAt = new Date().toISOString();

  // KQL-ish filter the SO client accepts. `attributes.` prefix is required —
  // SOs are stored namespaced under their type, so the filter applies inside
  // that namespace.
  const filter = lastRunAt
    ? nodeBuilder.range(`${CASE_SAVED_OBJECT}.attributes.updated_at`, 'gt', lastRunAt)
    : undefined;

  // Open a PIT (Point-In-Time) so paging is consistent against a fixed
  // snapshot of the index — concurrent writes don't shift our results.
  const pit = await savedObjectsClient.openPointInTimeForType(CASE_SAVED_OBJECT);

  let processed = 0;
  let searchAfter: SortResults | undefined;

  try {
    while (true) {
      const page = await savedObjectsClient.find<CasePersistedAttributes>({
        type: CASE_SAVED_OBJECT,
        filter,
        // Walking by `updated_at` ascending means the runner always processes
        // older edits before newer ones, which is the order that matches
        // user-perceived edit time. Doesn't affect correctness — the writer's
        // upsert is order-independent — but it does mean dashboards reflect
        // a coherent progression as the tick runs.
        sortField: 'updated_at',
        sortOrder: 'asc',
        perPage: PAGE_SIZE,
        pit: { id: pit.id },
        searchAfter,
      });

      if (page.saved_objects.length === 0) {
        break;
      }

      for (const so of page.saved_objects) {
        // Fire-and-forget — `upsertCase` doesn't throw, the writer logs its
        // own errors. The runner counts attempts, not successes.
        writer.upsertCase(so);
        processed++;
      }

      // The last result's `sort` field is the cursor for the next page.
      searchAfter = getLastSort(page.saved_objects);

      // Partial page = end of the result set; no point in another round-trip.
      if (page.saved_objects.length < PAGE_SIZE) {
        break;
      }
    }
  } finally {
    // Always close the PIT — leaked PITs hold ES resources until they expire.
    await savedObjectsClient.closePointInTime(pit.id);
  }

  logger.info(
    `cases-analyticsV2: reconciliation processed=${processed} lastRunAt=${
      lastRunAt ?? '<none>'
    } newLastRunAt=${tickStartedAt}`
  );

  return { newLastRunAt: tickStartedAt, processed };
}

/**
 * Pulls the `sort` cursor off the last result in a page. Extracted so the
 * runner's loop stays readable; `sort` on a `SavedObjectsFindResult` is the
 * ES `SortResults` array we feed back into the next `find` as `searchAfter`.
 */
function getLastSort<T>(results: Array<SavedObjectsFindResult<T>>): SortResults | undefined {
  return results[results.length - 1]?.sort;
}

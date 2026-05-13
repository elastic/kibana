/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import { fromKueryExpression, nodeBuilder } from '@kbn/es-query';
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
 * **Cursor advancement.** On successful drain, `last_run_at` advances to the
 * tick start time. Any case updated *during* the tick will land in the next
 * tick's window (since its `updated_at` > tickStartedAt). Caller is
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
  //
  // **Why two clauses, not one.** Newly-created cases land in the SO store
  // with `updated_at = null` (`transformNewCase` in common/utils.ts). A
  // filter that only matches `updated_at > lastRunAt` would never see them,
  // and the very scenario this backstop exists for — fire-and-forget write
  // failed at create time — would stay broken forever. So:
  //   - clause 1: updated_at > lastRunAt          (existing case, patched)
  //   - clause 2: updated_at IS MISSING/NULL
  //               AND created_at > lastRunAt      (case never patched, still
  //                                                missed by the writer)
  // `fromKueryExpression('not <field>:*')` is the standard KQL idiom for
  // "field is missing or null" — there's no nodeBuilder helper for it.
  const filter = lastRunAt
    ? nodeBuilder.or([
        nodeBuilder.range(`${CASE_SAVED_OBJECT}.attributes.updated_at`, 'gt', lastRunAt),
        nodeBuilder.and([
          fromKueryExpression(`not ${CASE_SAVED_OBJECT}.attributes.updated_at:*`),
          nodeBuilder.range(`${CASE_SAVED_OBJECT}.attributes.created_at`, 'gt', lastRunAt),
        ]),
      ])
    : undefined;

  // Open a PIT (Point-In-Time) so paging is consistent against a fixed
  // snapshot of the index — concurrent writes don't shift our results.
  const pit = await savedObjectsClient.openPointInTimeForType(CASE_SAVED_OBJECT);

  let processed = 0;
  let searchAfter: SortResults | undefined;
  // Per-space counts for the summary log line. On a heavily-tenanted cluster
  // "where did the missing case live?" is much easier to answer when the
  // reconciliation log already tells you which spaces produced output.
  const processedBySpace = new Map<string, number>();

  try {
    while (true) {
      const page = await savedObjectsClient.find<CasePersistedAttributes>({
        type: CASE_SAVED_OBJECT,
        filter,
        // Sorting by `created_at` (always non-null) rather than `updated_at`
        // (null on new cases) keeps PIT + searchAfter pagination stable —
        // search_after with a null cursor value can skip or duplicate docs
        // depending on the field's `missing` semantics. Created order isn't
        // user-perceived edit order, but order doesn't matter for analytics
        // correctness (upsert is idempotent).
        sortField: 'created_at',
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
        // Bucket by space for the summary log. Cases SOs are
        // namespace-scoped (`multiple-isolated`); `namespaces` is always a
        // single-element array. `??` defaults to 'default' for the
        // theoretical edge case where the array is empty.
        const space = so.namespaces?.[0] ?? 'default';
        processedBySpace.set(space, (processedBySpace.get(space) ?? 0) + 1);
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

  // Per-space breakdown for the log line — formatted as `space=N` pairs,
  // sorted by count descending so the loudest spaces lead. Omitted when no
  // cases were processed (the message is already trivially "processed=0").
  const perSpaceSummary =
    processedBySpace.size === 0
      ? ''
      : ` by_space={${[...processedBySpace.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([space, n]) => `${space}=${n}`)
          .join(', ')}}`;

  logger.info(
    `cases-analyticsV2: reconciliation processed=${processed}${perSpaceSummary} lastRunAt=${
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

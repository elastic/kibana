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
 * Maximum number of case SOs fetched per ES round-trip. Modest enough
 * that Task Manager's task-runtime budget isn't a concern even on cases
 * with heavy `extended_fields` payloads.
 */
const PAGE_SIZE = 100;

/**
 * Cap on the per-space breakdown the summary log reports. Heavy-tenant
 * clusters (1000+ spaces) would otherwise produce log lines large enough
 * to break ingest pipelines; capping keeps the line readable while still
 * surfacing the top contributors to a noisy tick.
 */
const SUMMARY_TOP_N_SPACES = 25;

export interface RunReconciliationDeps {
  /** Internal SO client (no request scope). Used to walk every case across every space. */
  savedObjectsClient: SavedObjectsClientContract;
  writer: CasesAnalyticsV2WriterContract;
  logger: Logger;
  /**
   * ISO timestamp from the previous successful tick — only cases updated
   * AFTER this point are walked. `undefined` on the first run, in which
   * case the runner walks every case (backfill mode). To force a backfill
   * later, an administrator hits `/reset`, which clears task state.
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
 * Reconciliation tick. Walks every case saved object updated since the
 * last successful tick and re-emits its analytics doc via the writer.
 *
 * **Why this exists.** The primary write path (the SO-service hooks) is
 * fire-and-forget — errors are logged and swallowed so analytics never
 * blocks the user's request. A transient ES blip can therefore leave a
 * case un-mirrored. This task is the durability backstop: every tick
 * re-walks recent activity, and `writer.upsertCase` is idempotent, so
 * misses self-heal silently.
 *
 * **Why PIT + searchAfter.** The SO `find` API with `page` caps at
 * `index.max_result_window` (~10k); the first run from an empty cursor
 * (backfill mode) can exceed that. PIT + searchAfter has no such cap.
 *
 * **Cursor advancement.** On successful drain, `last_run_at` advances to
 * the tick start time captured before any I/O. Any case updated *during*
 * the tick lands in the next tick's window. Caller persists the result.
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
        // No `sortField` — the SO API uses `_shard_doc` by default with a
        // PIT, which is unique per doc (no ties → no `searchAfter` skips
        // or dupes when many cases share the same timestamp, e.g. bulk
        // imports) and is the optimal sort for PIT walks per ES docs.
        // Result order isn't analytically meaningful — upsert is
        // idempotent, so any traversal order is correct.
        perPage: PAGE_SIZE,
        pit: { id: pit.id },
        searchAfter,
      });

      if (page.saved_objects.length === 0) {
        break;
      }

      // Dispatch the entire page as a single `_bulk` request and **await**
      // its completion before fetching the next page. Two reasons:
      //   1. Bulk dispatch collapses N ES `index` requests into 1, keeping
      //      the connection pool from saturating on cold-start / post-reset
      //      walks that can span tens of thousands of cases.
      //   2. Awaiting between pages bounds concurrency to one in-flight
      //      bulk per runner. A per-item fire-and-forget loop could fan
      //      thousands of writes into ES while the runner kept paging — ES
      //      indexing-queue overflow → 429s → writer's retry budget
      //      exhausts → reconciliation drops docs the next tick then has
      //      to repair. Serializing pages avoids the failure mode
      //      entirely.
      // `bulkUpsertCasesAwait` **throws** on bulk-level failure / retry
      // exhaustion (retryable per-item failures, e.g. 429s, count as
      // retryable). That propagation is deliberate: it aborts the tick
      // before we persist the new cursor, so the next tick re-walks the
      // same window. Permanent per-item failures (mapper errors etc.)
      // are logged inside the writer but do NOT throw — those cases
      // can't be repaired by reconciliation regardless and rely on the
      // case's next update to retry the mirror.
      await writer.bulkUpsertCasesAwait(page.saved_objects);

      for (const so of page.saved_objects) {
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

  // Per-space breakdown for the log line — top-N by count, descending,
  // so heavy-tenant clusters stay readable. Sort cost stays bounded at
  // O(S log SUMMARY_TOP_N_SPACES) regardless of space cardinality, and
  // total log line stays bounded too.
  const perSpaceSummary = formatTopSpaces(processedBySpace);

  logger.info(
    `cases-analyticsV2: reconciliation processed=${processed}${perSpaceSummary} lastRunAt=${
      lastRunAt ?? '<none>'
    } newLastRunAt=${tickStartedAt}`
  );

  return { newLastRunAt: tickStartedAt, processed };
}

/**
 * Pulls the `sort` cursor off the last result in a page. Extracted so the
 * runner's loop stays readable; `sort` on a `SavedObjectsFindResult` is
 * the ES `SortResults` array we feed back as `searchAfter` next page.
 */
function getLastSort<T>(results: Array<SavedObjectsFindResult<T>>): SortResults | undefined {
  return results[results.length - 1]?.sort;
}

/**
 * Format the top-N per-space counts as ` by_space={a=10, b=8, ...}` for
 * the summary log. Returns an empty string when no cases were processed.
 *
 * Bounded selection (partial-sort by hand) keeps cost at O(S × N) rather
 * than O(S log S) — matters at thousands of spaces × short reconciliation
 * intervals.
 */
function formatTopSpaces(processedBySpace: Map<string, number>): string {
  if (processedBySpace.size === 0) return '';

  const top: Array<[string, number]> = [];
  for (const entry of processedBySpace) {
    if (top.length < SUMMARY_TOP_N_SPACES) {
      top.push(entry);
      continue;
    }
    let minIdx = 0;
    for (let i = 1; i < top.length; i++) {
      if (top[i][1] < top[minIdx][1]) minIdx = i;
    }
    if (entry[1] > top[minIdx][1]) top[minIdx] = entry;
  }
  top.sort((a, b) => b[1] - a[1]);

  let summary = ' by_space={';
  for (let i = 0; i < top.length; i++) {
    if (i > 0) summary += ', ';
    summary += `${top[i][0]}=${top[i][1]}`;
  }
  if (processedBySpace.size > SUMMARY_TOP_N_SPACES) {
    summary += `, ... +${processedBySpace.size - SUMMARY_TOP_N_SPACES} more`;
  }
  summary += '}';
  return summary;
}

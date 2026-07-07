/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import { fromKueryExpression, nodeBuilder } from '@kbn/es-query';
import { CASE_ATTACHMENT_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import type {
  AttachmentPersistedAttributes,
  UnifiedAttachmentAttributes,
} from '../../common/types/attachments_v2';
import type { AttachmentSource, CasesAttachmentsV2WriterContract } from '../writer/attachments';
import {
  RECONCILIATION_NAMESPACES_ALL,
  RECONCILIATION_PAGE_SIZE,
  RECONCILIATION_SUMMARY_TOP_N_SPACES,
} from './constants';

/**
 * The two SO types the attachments runner walks on every tick. Since
 * PR #275225 the unified `cases-attachments` SO type is always
 * registered with core alongside the legacy `cases-comments` type, so
 * every tick walks both unconditionally — there is no config-gated
 * single-source mode to select. Legacy is listed first only so the
 * per-source summary log line reads consistently across ticks.
 *
 * Both types feed the same writer (`bulkUpsertAttachmentsAwait`); the
 * doc-builder normalizes both shapes into the unified analytics doc.
 * The single shared cursor (`attachments_last_run_at`) drives both
 * walks — idempotent upsert means an attachment that appears in both
 * source types (e.g. an id migrated between buckets) overwrites the
 * prior write with no analytics-side consequence.
 */
const SOURCE_TYPES: ReadonlyArray<{ type: string; label: 'legacy' | 'unified' }> = [
  { type: CASE_COMMENT_SAVED_OBJECT, label: 'legacy' },
  { type: CASE_ATTACHMENT_SAVED_OBJECT, label: 'unified' },
];

export interface RunAttachmentsReconciliationDeps {
  /** Internal SO client (no request scope). Used to walk every attachment across every space. */
  savedObjectsClient: SavedObjectsClientContract;
  attachmentsWriter: CasesAttachmentsV2WriterContract;
  logger: Logger;
  /**
   * ISO timestamp from the previous successful tick. Only attachments
   * updated (or created, on the OR-NULL branch) after this point are
   * walked. `undefined` on the first run (backfill mode, walks every
   * attachment). `/reset` clears the cursor to force a backfill later.
   */
  lastRunAt: string | undefined;
  /**
   * Optional sleep between pages, in milliseconds. Default `0` (yield
   * via `setImmediate` only). Same semantics as the cases + activity
   * runners' `pageDelayMs`. Wired from
   * `xpack.cases.analyticsV2.resetPageDelayMs` when invoked from the
   * reset task.
   */
  pageDelayMs?: number;
  /**
   * Optional progress callback fired after each page's bulk-upsert
   * completes. `processed` is the cumulative count for the current
   * walk across BOTH source SO types — the legacy walk's count is
   * carried over into the unified walk so subscribers see a single
   * monotonic running total per surface.
   */
  onPageComplete?: (info: { processed: number }) => void;
}

export interface RunAttachmentsReconciliationResult {
  /** ISO timestamp to persist as the next `attachments_last_run_at`. */
  newLastRunAt: string;
  /** Count of attachment docs re-emitted across both source SO types. */
  processed: number;
}

/**
 * Attachments reconciliation tick. Walks every attachment saved object
 * from BOTH the legacy `cases-comments` SO type AND the new unified
 * `cases-attachments` SO type, and re-emits each as an analytics doc
 * via the writer.
 *
 * Walks each source type sequentially — the bulk-in-flight invariant
 * (one bulk per runner) is preserved by `bulkUpsertAttachmentsAwait`'s
 * await-between-pages contract, but parallelizing the two walks would
 * double the in-flight count. Sequential keeps the per-walk concurrency
 * at one across the whole tick.
 *
 * Filter is the cases-surface mutable shape (`updated_at > lastRunAt
 * OR (updated_at IS MISSING AND created_at > lastRunAt)`), not the
 * activity-surface immutable shape. Attachments are mutable (patch
 * supported), and freshly-created attachments arrive with
 * `updated_at = null` (mirrors the cases SO behavior — `transformNew*`
 * sets it to null on create). The OR branch surfaces never-patched
 * attachments whose first write hook silently failed.
 *
 * Cascade-on-case-delete is not handled here. When a case is deleted,
 * its attachment SOs are cascaded by the SO layer; reconciliation
 * walks forward from the cursor and never sees the gap. The
 * attachments writer's `bulkDeleteAttachmentsByCaseIds` path (called
 * from `CasesService.deleteCase` and `bulkDeleteCaseEntities`) is the
 * only path that drops orphaned analytics docs.
 */
export async function runAttachmentsReconciliation({
  savedObjectsClient,
  attachmentsWriter,
  logger,
  lastRunAt,
  pageDelayMs = 0,
  onPageComplete,
}: RunAttachmentsReconciliationDeps): Promise<RunAttachmentsReconciliationResult> {
  // Tick start, captured before any I/O. Persisted as the new cursor
  // on a successful drain so attachments updated during the tick land
  // in the next window rather than being skipped.
  const tickStartedAt = new Date().toISOString();

  let processed = 0;
  // Per-source per-space counts for the summary log line. Source label
  // is appended to the space key (`legacy:default` / `unified:default`)
  // so the summary surfaces the migration progress at a glance.
  const processedBySpace = new Map<string, number>();

  for (const { type: soType, label } of SOURCE_TYPES) {
    const fieldPrefix = `${soType}.attributes`;

    // Same shape as the cases-surface filter — see runner.ts for the
    // full rationale on the OR-NULL branch.
    const filter = lastRunAt
      ? nodeBuilder.or([
          nodeBuilder.range(`${fieldPrefix}.updated_at`, 'gt', lastRunAt),
          nodeBuilder.and([
            fromKueryExpression(`not ${fieldPrefix}.updated_at:*`),
            nodeBuilder.range(`${fieldPrefix}.created_at`, 'gt', lastRunAt),
          ]),
        ])
      : undefined;

    // Open a PIT per source type for consistent paging against a fixed
    // snapshot. `NAMESPACES_ALL` is required for the same reason as in
    // the other runners.
    const pit = await savedObjectsClient.openPointInTimeForType(soType, {
      namespaces: RECONCILIATION_NAMESPACES_ALL as string[],
    });

    let searchAfter: SortResults | undefined;

    try {
      while (true) {
        const page = await savedObjectsClient.find<
          AttachmentPersistedAttributes | UnifiedAttachmentAttributes
        >({
          type: soType,
          filter,
          // Must pass `namespaces: ['*']` even with the unscoped internal
          // SO client — see runner.ts for the detailed explanation.
          namespaces: RECONCILIATION_NAMESPACES_ALL as string[],
          // No `sortField` — with a PIT the SO API defaults to
          // `_shard_doc`, which is unique per doc (no ties → no
          // searchAfter skips or dupes) and is the recommended sort for
          // PIT walks.
          perPage: RECONCILIATION_PAGE_SIZE,
          pit: { id: pit.id },
          searchAfter,
        });

        if (page.saved_objects.length === 0) {
          break;
        }

        // Dispatch the page as a single `_bulk` request and await it
        // before fetching the next page. Same rationale as in the
        // other runners.
        await attachmentsWriter.bulkUpsertAttachmentsAwait(
          page.saved_objects as AttachmentSource[]
        );

        for (const so of page.saved_objects) {
          processed++;
          const space = so.namespaces?.[0] ?? 'default';
          const key = `${label}:${space}`;
          processedBySpace.set(key, (processedBySpace.get(key) ?? 0) + 1);
        }

        // Live progress signal — see the matching call in runner.ts.
        // Cumulative across both source walks.
        onPageComplete?.({ processed });

        searchAfter = getLastSort(page.saved_objects);

        if (page.saved_objects.length < RECONCILIATION_PAGE_SIZE) {
          break;
        }

        // Yield to the event loop between pages — see the matching
        // comment in runner.ts. Attachments tend to be larger per-doc
        // than cases (they carry data/metadata blobs), so the ELU yield
        // matters here too.
        if (pageDelayMs > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, pageDelayMs));
        } else {
          await new Promise<void>((resolve) => setImmediate(resolve));
        }
      }
    } finally {
      // Always close the PIT — leaked PITs hold ES resources until they
      // expire.
      await savedObjectsClient.closePointInTime(pit.id);
    }
  }

  const perSpaceSummary = formatTopSpaces(processedBySpace);

  logger.info(
    `cases-analyticsV2: attachments reconciliation processed=${processed}${perSpaceSummary} lastRunAt=${
      lastRunAt ?? '<none>'
    } newLastRunAt=${tickStartedAt}`
  );

  return { newLastRunAt: tickStartedAt, processed };
}

function getLastSort<T>(results: Array<SavedObjectsFindResult<T>>): SortResults | undefined {
  return results[results.length - 1]?.sort;
}

/**
 * Top-N counts formatted as ` by_source_space={legacy:a=10, unified:b=8, ...}`
 * for the summary log. Returns an empty string when no docs were
 * processed.
 *
 * Mirrors the cases + activity runners' helpers; not extracted to a
 * shared helper because the two surfaces evolve independently and a
 * shared helper would couple them (the attachments key is composite —
 * source-label-prefixed — while the cases / activity keys are the bare
 * space id).
 */
function formatTopSpaces(processedBySpace: Map<string, number>): string {
  if (processedBySpace.size === 0) return '';

  const top: Array<[string, number]> = [];
  for (const entry of processedBySpace) {
    if (top.length < RECONCILIATION_SUMMARY_TOP_N_SPACES) {
      top.push(entry);
    } else {
      let minIdx = 0;
      for (let i = 1; i < top.length; i++) {
        if (top[i][1] < top[minIdx][1]) minIdx = i;
      }
      if (entry[1] > top[minIdx][1]) top[minIdx] = entry;
    }
  }
  top.sort((a, b) => b[1] - a[1]);

  let summary = ' by_source_space={';
  for (let i = 0; i < top.length; i++) {
    if (i > 0) summary += ', ';
    summary += `${top[i][0]}=${top[i][1]}`;
  }
  if (processedBySpace.size > RECONCILIATION_SUMMARY_TOP_N_SPACES) {
    summary += `, ... +${processedBySpace.size - RECONCILIATION_SUMMARY_TOP_N_SPACES} more`;
  }
  summary += '}';
  return summary;
}

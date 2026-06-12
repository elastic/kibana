/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import { once } from 'events';

import type { Logger } from '@kbn/core/server';
import type { Observable } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';

import { flattenOsqueryHit } from '../../common/utils/flatten_osquery_hit';
import type { ResultFormatter, ExportMetadata } from './format_results';
import type {
  ExportResultsRequestOptions,
  ExportResultsStrategyResponse,
} from '../../common/search_strategy/osquery';
import { OsqueryQueries } from '../../common/search_strategy/osquery';

const MAX_EXPORT_RESULTS = 500_000;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Deduplicates osquery multi-field sub-fields (.text, .number) from a flattened record.
 * ES returns both `osquery.pid` (text) and `osquery.pid.number` (long) for the same value.
 * For exports, we keep the `.number` variant (typed) when it exists and drop `.text`,
 * matching the deduplication logic in UnifiedResultsTable.
 */
function deduplicateFields(record: Record<string, unknown>): Record<string, unknown> {
  const keys = Object.keys(record);
  const result: Record<string, unknown> = {};

  for (const key of keys) {
    // Skip .text sub-fields — the parent field has the same value
    if (key.endsWith('.text')) {
      const parent = key.slice(0, -5);
      if (parent in record) continue;
    }

    // Skip parent osquery.* fields when a .number sub-field exists (prefer typed value)
    if (key.startsWith('osquery.') && !key.endsWith('.number') && !key.endsWith('.text')) {
      if (`${key}.number` in record) continue;
    }

    result[key] = record[key];
  }

  return result;
}

/**
 * Writes a chunk to a PassThrough and honours Node stream backpressure.
 * If `write()` returns false, awaits the `drain` event before resolving.
 * If the abort signal fires while awaiting drain, resolves without writing more.
 */
async function writeWithBackpressure(
  stream: PassThrough,
  chunk: string,
  signal: AbortSignal
): Promise<void> {
  const ok = stream.write(chunk);
  if (ok || signal.aborted) return;

  try {
    await once(stream, 'drain', { signal });
  } catch {
    // AbortError — the caller's loop checks `signal.aborted` and will exit cleanly.
  }
}

export type BaseExportRequest = Omit<
  ExportResultsRequestOptions,
  'pit' | 'searchAfter' | 'trackTotalHits'
>;

export interface ExportResultsToStreamOptions {
  /**
   * Scoped search client from `context.search` — routes page fetches through
   * the osquery search strategy so index resolution, CCS prefixing, and
   * internal-user selection are handled centrally by the factory.
   */
  search: IScopedSearchClient;
  /** PIT opened by the route handler (PIT lifecycle stays in the route; see design D5). */
  pit: { id: string; keep_alive: string };
  /**
   * Callback invoked by cleanup to close the PIT. The route handler owns PIT
   * open/close lifecycle; this callback delegates the close timing to the stream.
   */
  closePit: (pitId: string) => Promise<void>;
  /** All export request fields except those the loop varies per page. */
  baseRequest: BaseExportRequest;
  formatter: ResultFormatter;
  metadata: ExportMetadata;
  aborted$: Observable<void>;
  logger: Logger;
  /**
   * ECS field mapping from the saved query / action. When provided, rows are
   * enriched with ECS-mapped columns pulled from `_source` so that the export
   * matches the UI's column set.
   */
  ecsMapping?: ECSMapping;
}

export interface ExportResultsError {
  statusCode: number;
  message: string;
}

export async function exportResultsToStream({
  search,
  pit,
  closePit,
  baseRequest,
  formatter,
  metadata,
  aborted$,
  logger,
  ecsMapping,
}: ExportResultsToStreamOptions): Promise<PassThrough | ExportResultsError> {
  const stream = new PassThrough();
  const abortController = new AbortController();

  const abortSubscription = aborted$.subscribe(() => {
    abortController.abort();
    stream.destroy();
  });

  const cleanup = async () => {
    abortSubscription.unsubscribe();
    await closePit(pit.id);
  };

  try {
    // First page — check total count and request track_total_hits
    const firstPageResponse = await lastValueFrom(
      search.search<ExportResultsRequestOptions, ExportResultsStrategyResponse>(
        {
          ...baseRequest,
          factoryQueryType: OsqueryQueries.exportResults,
          pit,
          trackTotalHits: true,
        },
        { strategy: 'osquerySearchStrategy', abortSignal: abortController.signal }
      )
    );

    const firstPage = firstPageResponse.rawResponse;

    const total =
      typeof firstPage.hits.total === 'number'
        ? firstPage.hits.total
        : firstPage.hits.total?.value ?? 0;

    if (total > MAX_EXPORT_RESULTS) {
      await cleanup();

      return {
        statusCode: 400,
        message: `Export limited to ${MAX_EXPORT_RESULTS.toLocaleString()} results. Found ${total.toLocaleString()}. Please add filters to narrow results.`,
      };
    }

    // Update metadata with total and start streaming asynchronously
    const enrichedMetadata = { ...metadata, total_results: total };

    // Pre-flatten first-page rows so formatters can pre-scan column shape
    // before any bytes are written to the stream. This fixes the CSV header
    // being locked to only row 1's keys — the CSV formatter now sees the
    // column union of the first page.
    const firstPageRecords = firstPage.hits.hits.map((hit) =>
      deduplicateFields(flattenOsqueryHit(hit, ecsMapping))
    );
    if (formatter.finalizeColumns) {
      formatter.finalizeColumns(firstPageRecords);
    }

    const firstPageKeyUnion = new Set<string>();
    for (const record of firstPageRecords) {
      for (const key of Object.keys(record)) {
        firstPageKeyUnion.add(key);
      }
    }

    let warnedKeysBeyondFirstPage = false;
    const warnIfRecordHasUnseenKeys = (record: Record<string, unknown>) => {
      if (!formatter.finalizeColumns || warnedKeysBeyondFirstPage) return;
      for (const key of Object.keys(record)) {
        if (!firstPageKeyUnion.has(key)) {
          warnedKeysBeyondFirstPage = true;
          logger.warn(
            'CSV export row contains field(s) not present in the first result page; those columns are omitted from the header and all rows.',
            {
              labels: {
                action_id: metadata.action_id,
                format: metadata.format,
                example_field: key,
                ...(metadata.execution_count != null
                  ? { execution_count: metadata.execution_count }
                  : {}),
              },
            }
          );
          break;
        }
      }
    };

    // Defer streaming to the next macrotask tick so the route handler can
    // attach the returned PassThrough to the HTTP response before any writes
    // occur. A macrotask (setImmediate) rather than a microtask is required
    // because consumers (and tests) install listeners/spies on the returned
    // stream synchronously after the await returns — a microtask would fire
    // before those listeners are in place.
    setImmediate(async () => {
      const signal = abortController.signal;

      try {
        let isFirstRow = true;

        // Write opening (metadata header, JSON opening bracket, etc.)
        const opening = formatter.opening(enrichedMetadata);
        if (opening) {
          await writeWithBackpressure(stream, opening, signal);
        }

        // Process first page
        for (const record of firstPageRecords) {
          if (signal.aborted) break;
          await writeWithBackpressure(stream, formatter.row(record, isFirstRow), signal);
          isFirstRow = false;
        }

        // Get search_after from last hit
        let searchAfter =
          firstPage.hits.hits.length > 0
            ? firstPage.hits.hits[firstPage.hits.hits.length - 1].sort
            : undefined;

        // Page through remaining results
        while (searchAfter && !signal.aborted) {
          const pageResponse = await lastValueFrom(
            search.search<ExportResultsRequestOptions, ExportResultsStrategyResponse>(
              {
                ...baseRequest,
                factoryQueryType: OsqueryQueries.exportResults,
                pit,
                searchAfter,
              },
              { strategy: 'osquerySearchStrategy', abortSignal: signal }
            )
          );

          const page = pageResponse.rawResponse;

          if (page.hits.hits.length === 0) break;

          for (const hit of page.hits.hits) {
            if (signal.aborted) break;
            const flattened = deduplicateFields(flattenOsqueryHit(hit, ecsMapping));
            warnIfRecordHasUnseenKeys(flattened);
            await writeWithBackpressure(stream, formatter.row(flattened, isFirstRow), signal);
            isFirstRow = false;
          }

          searchAfter =
            page.hits.hits.length > 0 ? page.hits.hits[page.hits.hits.length - 1].sort : undefined;
        }

        // Write closing (JSON closing bracket, etc.)
        const closing = formatter.closing();
        if (closing) {
          await writeWithBackpressure(stream, closing, signal);
        }
      } catch (e) {
        if (!signal.aborted) {
          // Headers have already been sent by this point, so the HTTP status code
          // cannot be changed. Log structured meta so support can correlate the
          // truncated download with server state. `labels` is the ECS-standard
          // field for plugin-specific custom key/value pairs in log meta.
          const errorMessage = getErrorMessage(e);
          logger.error(`Export stream error: ${errorMessage}`, {
            labels: {
              action_id: enrichedMetadata.action_id,
              format: enrichedMetadata.format,
              total_results: enrichedMetadata.total_results,
              ...(enrichedMetadata.execution_count != null
                ? { execution_count: enrichedMetadata.execution_count }
                : {}),
            },
          });
          stream.destroy(e instanceof Error ? e : new Error(errorMessage));
        }
      } finally {
        await cleanup();
        if (!stream.destroyed) {
          stream.end();
        }
      }
    });

    return stream;
  } catch (e) {
    await cleanup();
    throw e;
  }
}

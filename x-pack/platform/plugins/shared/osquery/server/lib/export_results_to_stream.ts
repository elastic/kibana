/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import { once } from 'events';

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { Observable } from 'rxjs';

import { flattenOsqueryHit } from '../../common/utils/flatten_osquery_hit';
import type { ResultFormatter, ExportMetadata } from './format_results';

const EXPORT_PAGE_SIZE = 1_000;
const MAX_EXPORT_RESULTS = 500_000;

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

export interface ExportResultsToStreamOptions {
  esClient: ElasticsearchClient;
  index: string;
  query: estypes.QueryDslQueryContainer;
  formatter: ResultFormatter;
  metadata: ExportMetadata;
  aborted$: Observable<void>;
  logger: Logger;
}

export interface ExportResultsError {
  statusCode: number;
  message: string;
}

export async function exportResultsToStream({
  esClient,
  index,
  query,
  formatter,
  metadata,
  aborted$,
  logger,
}: ExportResultsToStreamOptions): Promise<PassThrough | ExportResultsError> {
  const stream = new PassThrough();
  const abortController = new AbortController();

  const abortSubscription = aborted$.subscribe(() => {
    abortController.abort();
    stream.destroy();
  });

  let pitId: string | undefined;

  const cleanup = async () => {
    abortSubscription.unsubscribe();
    if (pitId) {
      try {
        await esClient.closePointInTime({ id: pitId });
      } catch (e) {
        logger.debug(`Failed to close PIT: ${e.message}`);
      }

      pitId = undefined;
    }
  };

  try {
    const pitResponse = await esClient.openPointInTime({
      index,
      keep_alive: '5m',
    });
    pitId = pitResponse.id;

    // First page — check total count
    const firstPage = await esClient.search({
      pit: { id: pitId, keep_alive: '5m' },
      query,
      size: EXPORT_PAGE_SIZE,
      track_total_hits: true,
      fields: ['elastic_agent.*', 'agent.*', 'osquery.*'],
      sort: [{ '@timestamp': { order: 'desc' as const } }, '_doc'],
      _source: ['agent'],
    });

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

    // Use setTimeout to start streaming on the next tick (proven pattern from lists plugin)
    setTimeout(async () => {
      const signal = abortController.signal;

      try {
        let isFirstRow = true;

        // Write opening (metadata header, JSON opening bracket, etc.)
        const opening = formatter.opening(enrichedMetadata);
        if (opening) {
          await writeWithBackpressure(stream, opening, signal);
        }

        // Process first page
        for (const hit of firstPage.hits.hits) {
          if (signal.aborted) break;
          const flattened = deduplicateFields(flattenOsqueryHit(hit));
          await writeWithBackpressure(stream, formatter.row(flattened, isFirstRow), signal);
          isFirstRow = false;
        }

        // Get search_after from last hit
        let searchAfter =
          firstPage.hits.hits.length > 0
            ? firstPage.hits.hits[firstPage.hits.hits.length - 1].sort
            : undefined;

        // Page through remaining results
        while (searchAfter && !signal.aborted) {
          const page = await esClient.search(
            {
              pit: { id: pitId!, keep_alive: '5m' },
              query,
              size: EXPORT_PAGE_SIZE,
              fields: ['elastic_agent.*', 'agent.*', 'osquery.*'],
              sort: [{ '@timestamp': { order: 'desc' as const } }, '_doc'],
              search_after: searchAfter,
              _source: ['agent'],
            },
            { signal }
          );

          if (page.hits.hits.length === 0) break;

          for (const hit of page.hits.hits) {
            if (signal.aborted) break;
            const flattened = deduplicateFields(flattenOsqueryHit(hit));
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
          logger.error(`Export stream error: ${e.message}`, {
            labels: {
              action_id: enrichedMetadata.action_id,
              format: enrichedMetadata.format,
              total_results: enrichedMetadata.total_results,
              ...(enrichedMetadata.execution_count != null
                ? { execution_count: enrichedMetadata.execution_count }
                : {}),
            },
          });
          stream.destroy(e);
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';

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
      try {
        let isFirstRow = true;

        // Write opening (metadata header, JSON opening bracket, etc.)
        const opening = formatter.opening(enrichedMetadata);
        if (opening) {
          stream.write(opening);
        }

        // Process first page
        for (const hit of firstPage.hits.hits) {
          if (abortController.signal.aborted) break;
          const flattened = deduplicateFields(flattenOsqueryHit(hit));
          stream.write(formatter.row(flattened, isFirstRow));
          isFirstRow = false;
        }

        // Get search_after from last hit
        let searchAfter =
          firstPage.hits.hits.length > 0
            ? firstPage.hits.hits[firstPage.hits.hits.length - 1].sort
            : undefined;

        // Page through remaining results
        while (searchAfter && !abortController.signal.aborted) {
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
            { signal: abortController.signal }
          );

          if (page.hits.hits.length === 0) break;

          for (const hit of page.hits.hits) {
            if (abortController.signal.aborted) break;
            const flattened = deduplicateFields(flattenOsqueryHit(hit));
            stream.write(formatter.row(flattened, isFirstRow));
            isFirstRow = false;
          }

          searchAfter =
            page.hits.hits.length > 0 ? page.hits.hits[page.hits.hits.length - 1].sort : undefined;
        }

        // Write closing (JSON closing bracket, etc.)
        const closing = formatter.closing();
        if (closing) {
          stream.write(closing);
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          logger.error(`Export stream error: ${e.message}`);
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

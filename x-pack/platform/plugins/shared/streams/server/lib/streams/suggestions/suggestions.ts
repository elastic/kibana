/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Streams } from '@kbn/streams-schema';
import {
  generateStreamSuggestions,
  SUGGESTION_TYPES,
  type StreamSuggestion,
} from '@kbn/streams-ai';
import { describeDataset, formatDocumentAnalysis, getLogPatterns } from '@kbn/ai-tools';
import { createTracedEsClient } from '@kbn/traced-es-client';
import { merge, from, of, map, catchError } from 'rxjs';
import type { Observable } from 'rxjs';
import { LRUCache } from 'lru-cache';
import {
  getDegradedDocCountsForStreams,
  getDocCountsForStreams,
} from '../../../routes/streams/doc_counts/get_streams_doc_counts';

export type { StreamSuggestion };

const LOG_MESSAGE_FIELDS = ['message', 'body.text'];
const MAX_LOG_PATTERNS = 20;

/**
 * Module-level LRU cache for the expensive ES context queries (dataset analysis,
 * log patterns, doc counts). Keyed by `streamName:start:end`. This avoids
 * re-running the same queries across the N parallel per-type LLM calls and
 * across repeated requests within the TTL window (e.g. panel re-mounts).
 */
const contextCache = new LRUCache<string, CachedSuggestionsContext>({
  max: 50,
  ttl: 5 * 60 * 1000, // 5 minutes
});

interface CachedSuggestionsContext {
  formattedAnalysis: ReturnType<typeof formatDocumentAnalysis>;
  logPatterns: Array<{ field: string; pattern: string; count: number; sample: string }>;
  degradedDocsPct: number;
}

interface SuggestionsContext {
  esClient: ElasticsearchClient;
  esClientAsSecondaryAuthUser: ElasticsearchClient;
  isServerless: boolean;
  inferenceClient: BoundInferenceClient;
  start: number;
  end: number;
  signal: AbortSignal;
  logger: Logger;
}

async function fetchSuggestionsContext(
  definition: Streams.all.Definition,
  context: SuggestionsContext
): Promise<CachedSuggestionsContext> {
  const { esClient, esClientAsSecondaryAuthUser, isServerless, start, end, logger } = context;
  const streamName = definition.name;

  const tracedEsClient = createTracedEsClient({ client: esClient, logger, plugin: 'streams' });

  const [analysis, rawLogPatterns, totalResults, degradedResults] = await Promise.all([
    describeDataset({ start, end, esClient, index: streamName }),
    getLogPatterns({
      esClient: tracedEsClient,
      index: streamName,
      start,
      end,
      fields: LOG_MESSAGE_FIELDS,
    }),
    getDocCountsForStreams({ isServerless, esClient, esClientAsSecondaryAuthUser, streamName }),
    getDegradedDocCountsForStreams({ esClient, streamName }),
  ]);

  const formattedAnalysis = formatDocumentAnalysis(analysis, {
    dropEmpty: true,
    dropUnmapped: false,
  });

  const logPatterns = rawLogPatterns
    .slice(0, MAX_LOG_PATTERNS)
    .map(({ field, pattern, count, sample }) => ({ field, pattern, count, sample }));

  const totalCount = totalResults.find((s) => s.stream === streamName)?.count ?? 0;
  const degradedCount = degradedResults.find((s) => s.stream === streamName)?.count ?? 0;
  const degradedDocsPct = totalCount > 0 ? (degradedCount / totalCount) * 100 : 0;

  return { formattedAnalysis, logPatterns, degradedDocsPct };
}

/**
 * Streams suggestions to the caller as they are generated. One LLM call is
 * made per suggestion type, all in parallel. Each call always emits exactly
 * one value — a `StreamSuggestion` when applicable, or `null` when the type
 * doesn't apply to this stream. Emitting `null` lets the client know that
 * slot has resolved so it can remove the corresponding skeleton placeholder
 * immediately rather than waiting for the full stream to complete.
 *
 * ES context (dataset analysis, log patterns, doc counts) is fetched once and
 * shared across all parallel LLM calls. Results are cached in-process for 5
 * minutes to avoid redundant ES queries on repeated requests.
 */
export function getStreamSuggestions(
  definition: Streams.all.Definition,
  context: SuggestionsContext
): Observable<StreamSuggestion | null> {
  const { inferenceClient, start, end, signal, logger } = context;
  const streamName = definition.name;
  const cacheKey = `${streamName}:${start}:${end}`;

  const cachedContext = contextCache.get(cacheKey);
  const contextPromise: Promise<CachedSuggestionsContext> = cachedContext
    ? Promise.resolve(cachedContext)
    : fetchSuggestionsContext(definition, context).then((ctx) => {
        contextCache.set(cacheKey, ctx);
        return ctx;
      });

  const typeObservables = SUGGESTION_TYPES.map((type) =>
    from(
      contextPromise.then(({ formattedAnalysis, logPatterns, degradedDocsPct }) =>
        generateStreamSuggestions({
          definition,
          formattedAnalysis,
          logPatterns,
          degradedDocsPct,
          inferenceClient,
          signal,
          logger,
          allowedType: type,
        })
      )
    ).pipe(
      // Emit the suggestion if one was produced, or null to signal the slot is resolved.
      map((suggestions): StreamSuggestion | null => suggestions[0] ?? null),
      catchError((err) => {
        logger.warn(
          `Failed to generate "${type}" suggestion for stream "${streamName}": ${
            err?.message ?? err
          }`
        );
        // Still emit null so the client knows this slot is done.
        return of(null);
      })
    )
  );

  return merge(...typeObservables);
}

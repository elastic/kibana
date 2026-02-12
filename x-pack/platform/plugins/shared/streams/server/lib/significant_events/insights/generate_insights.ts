/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, ChatCompletionTokenCount } from '@kbn/inference-common';
import { sumTokens } from '@kbn/streams-ai';
import type { ElasticsearchClient, IScopedClusterClient, Logger } from '@kbn/core/server';
import type { SignificantEventsResponse } from '@kbn/streams-schema';
import type { InsightsResult } from '@kbn/streams-schema';
import type { QueryClient } from '../../streams/assets/query/query_client';
import type { StreamsClient } from '../../streams/client';
import { getRuleIdFromQueryLink } from '../../streams/assets/query/helpers/query';
import { readSignificantEventsFromAlertsIndices } from '../read_significant_events_from_alerts_indices';
import { SummarizeQueriesPrompt } from './prompts/summarize_queries/prompt';
import { SummarizeStreamsPrompt } from './prompts/summarize_streams/prompt';
import { extractInsightsFromResponse, type QueryData, type EnrichedQueryData } from './utils';
import { fetchAlertSampleDocuments } from './sample_documents';
import {
  filterChangedQueries,
  groupByStream,
  deriveBucketSize,
  type ChangedQuery,
} from './change_detection';

/** Default time range: 1 hour */
const DEFAULT_FROM_OFFSET_MS = 60 * 60 * 1000;

export interface GenerateInsightsParams {
  streamsClient: StreamsClient;
  queryClient: QueryClient;
  esClient: ElasticsearchClient;
  scopedClusterClient: IScopedClusterClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
  /** Stream names to analyze. If empty/undefined, analyzes all streams */
  streamNames?: string[];
  /** Start of time range (epoch ms). Default: 1 hour before to */
  from?: number;
  /** End of time range (epoch ms). Default: now */
  to?: number;
}

/**
 * Insights generation: change-filtered pipeline.
 *
 * 1. Reads significant events from alerts (histogram + change_points).
 * 2. Filters to changed queries by threshold.
 * 3. Generates insights only for changed queries, then optionally summarizes across streams.
 */
export async function generateInsights(params: GenerateInsightsParams): Promise<InsightsResult> {
  const {
    queryClient,
    esClient,
    scopedClusterClient,
    inferenceClient,
    signal,
    logger,
    streamNames = [],
    from: fromParam,
    to: toParam,
  } = params;

  const now = Date.now();
  const to = toParam ?? now;
  const from = fromParam ?? to - DEFAULT_FROM_OFFSET_MS;
  const bucketSize = deriveBucketSize(from, to);

  logger.debug(
    `[insights] Starting change-filtered pipeline: streams=${streamNames.length || 'all'}, ` +
      `range=${new Date(from).toISOString()}-${new Date(to).toISOString()}, bucket=${bucketSize}`
  );

  // Step 1: Get significant events with histogram and change points
  const { significant_events: significantEvents } = await readSignificantEventsFromAlertsIndices(
    {
      streamNames: streamNames.length > 0 ? streamNames : undefined,
      from: new Date(from),
      to: new Date(to),
      bucketSize,
    },
    { queryClient, scopedClusterClient }
  );

  logger.debug(`[insights] Found ${significantEvents.length} significant events`);

  if (significantEvents.length === 0) {
    return {
      insights: [],
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
    };
  }

  // Step 2: Filter to changed queries by threshold
  const changedQueries = filterChangedQueries(significantEvents, { logger });

  logger.debug(`[insights] Filtered to ${changedQueries.length} changed queries`);

  if (changedQueries.length === 0) {
    logger.info('[insights] No queries exceeded change threshold, skipping LLM');
    return {
      insights: [],
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
    };
  }

  // Step 3: Group by stream for per-stream processing
  const byStream = groupByStream(changedQueries);
  const streamCount = byStream.size;

  logger.debug(`[insights] Processing ${changedQueries.length} changed queries across ${streamCount} streams`);

  // Step 4: Generate insights per stream
  const streamInsightsResults = await Promise.all(
    Array.from(byStream.entries()).map(async ([streamName, queries]) => {
      const streamInsightResult = await generateStreamInsightsFromChangedQueries({
        streamName,
        changedQueries: queries,
        esClient,
        inferenceClient,
        signal,
        logger,
        from: new Date(from),
        to: new Date(to),
      });
      return {
        streamName,
        ...streamInsightResult,
      };
    })
  );

  // Filter out streams with no insights
  const streamInsightsWithData = streamInsightsResults.filter(
    (result) => result.insights.length > 0
  );

  const tokensUsed = streamInsightsResults.reduce<ChatCompletionTokenCount>(
    (acc, result) => sumTokens(acc, result.tokensUsed),
    { prompt: 0, completion: 0, total: 0 }
  );

  // If no stream insights, return empty
  if (streamInsightsWithData.length === 0) {
    logger.debug('[insights] No insights generated from any stream');
    return {
      insights: [],
      tokensUsed,
    };
  }

  // Single stream: return insights directly (merge/dig deeper happens in per-stream LLM call)
  // The LLM is already instructed to group related findings into single insights
  if (streamInsightsWithData.length === 1) {
    logger.debug(
      `[insights] Single stream mode: returning ${streamInsightsWithData[0].insights.length} insights for "${streamInsightsWithData[0].streamName}"`
    );
    return {
      insights: streamInsightsWithData[0].insights,
      tokensUsed,
    };
  }

  // Multi-stream: cross-reference and summarize stream-level insights
  logger.debug(
    `[insights] Multi-stream mode: cross-referencing insights from ${streamInsightsWithData.length} streams`
  );
  try {
    const response = await inferenceClient.prompt({
      prompt: SummarizeStreamsPrompt,
      input: {
        streamInsights: JSON.stringify(streamInsightsWithData),
      },
      abortSignal: signal,
    });

    const insights = extractInsightsFromResponse(response, logger);

    logger.debug(
      `[insights] Multi-stream summarization complete: ${insights.length} insights from ${streamInsightsWithData.length} streams`
    );

    return {
      insights,
      tokensUsed: sumTokens(tokensUsed, response.tokens),
    };
  } catch (error) {
    if (error.message.includes(`The request exceeded the model's maximum context length`)) {
      logger.info(
        `[insights] Context too large for cross-stream summarization (${streamInsightsWithData.length} streams), returning per-stream insights`
      );
      // Fall back to returning per-stream insights without summarization
      return {
        insights: streamInsightsWithData.flatMap((s) => s.insights),
        tokensUsed,
      };
    }

    throw error;
  }
}

/**
 * Generate insights for a single stream from pre-filtered changed queries.
 * Uses the event data directly rather than re-querying.
 */
async function generateStreamInsightsFromChangedQueries({
  streamName,
  changedQueries,
  esClient,
  inferenceClient,
  signal,
  logger,
  from,
  to,
}: {
  streamName: string;
  changedQueries: ChangedQuery[];
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
  from: Date;
  to: Date;
}): Promise<InsightsResult> {
  logger.debug(
    `[insights] Generating insights for stream "${streamName}" with ${changedQueries.length} changed queries`
  );

  // Collect sample documents for each changed query
  const queryDataList: EnrichedQueryData[] = [];

  for (const { event, percentageChange, changeType } of changedQueries) {
    // Get total count from occurrences
    const totalCount = event.occurrences.reduce((sum, occ) => sum + occ.count, 0);

    if (totalCount === 0) {
      continue;
    }

    // Collect sample documents using shared abstraction
    const queryData = await collectQueryDataFromEvent({
      event,
      esClient,
      from,
      to,
    });

    if (queryData) {
      // Enrich with change detection info
      queryDataList.push({
        ...queryData,
        percentageChange: Math.round(percentageChange * 10) / 10, // Round to 1 decimal
        changeType,
      });
    }
  }

  if (queryDataList.length === 0) {
    return {
      insights: [],
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
    };
  }

  try {
    const response = await inferenceClient.prompt({
      prompt: SummarizeQueriesPrompt,
      input: {
        streamName,
        queries: JSON.stringify(queryDataList),
      },
      abortSignal: signal,
    });

    const insights = extractInsightsFromResponse(response, logger);

    return {
      insights,
      tokensUsed: response.tokens ?? { prompt: 0, completion: 0, total: 0 },
    };
  } catch (error) {
    if (error.message.includes(`The request exceeded the model's maximum context length`)) {
      logger.debug(
        `[insights] Context too big for stream ${streamName}, queries: ${queryDataList.length}`,
        { error }
      );
      return {
        insights: [],
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
      };
    }

    throw error;
  }
}

const SAMPLE_EVENTS_COUNT = 5;

/**
 * Collect query data from a SignificantEventsResponse.
 * Retrieves sample documents from alerts index using the shared sample_documents abstraction.
 */
async function collectQueryDataFromEvent({
  event,
  esClient,
  from,
  to,
}: {
  event: SignificantEventsResponse;
  esClient: ElasticsearchClient;
  from: Date;
  to: Date;
}): Promise<QueryData | undefined> {
  // Derive rule ID from the query ID (same pattern as in collectQueryData)
  const ruleId = getRuleIdFromQueryLink({
    'asset.id': event.id,
    'asset.type': 'query',
    'asset.uuid': '', // Not used by getRuleIdFromQueryLink
    stream_name: event.stream_name,
    query: {
      id: event.id,
      title: event.title,
      kql: event.kql, // Already { query: string }
      feature: event.feature,
      severity_score: event.severity_score,
      evidence: event.evidence,
    },
  });

  // Use shared sample documents abstraction
  const { documents, totalCount } = await fetchAlertSampleDocuments(
    ruleId,
    from,
    to,
    esClient,
    { size: SAMPLE_EVENTS_COUNT }
  );

  if (totalCount === 0) {
    return undefined;
  }

  const sampleEvents = documents.map((doc) => JSON.stringify(doc));

  return {
    title: event.title,
    kql: event.kql.query, // Extract the KQL string from the object
    feature: event.feature
      ? { name: event.feature.name, filter: event.feature.filter }
      : undefined,
    currentCount: totalCount,
    sampleEvents,
  };
}


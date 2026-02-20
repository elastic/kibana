/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, ChatCompletionTokenCount } from '@kbn/inference-common';
import { sumTokens } from '@kbn/streams-ai';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { InsightsResult } from '@kbn/streams-schema';
import type { LogMeta } from '@kbn/logging';
import { parseError } from '../../streams/errors/parse_error';
import type { QueryClient } from '../../streams/assets/query/query_client';
import type { StreamsClient } from '../../streams/client';
import { SummarizeStreamsPrompt } from './prompts/summarize_streams/prompt';
import { extractInsightsFromResponse } from './extract_insights_from_response';
import { generateStreamInsights } from './generate_stream_insights';
import { getChangedQueryIdsByStream } from './get_changed_query_ids_by_stream';

export async function generateInsights({
  streamsClient,
  queryClient,
  esClient,
  inferenceClient,
  signal,
  logger,
  streamNames,
  from,
  to,
}: {
  streamsClient: StreamsClient;
  queryClient: QueryClient;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
  streamNames?: string[];
  /** Start of the time range to filter all Elasticsearch queries (ISO 8601). */
  from: string;
  /** End of the time range to filter all Elasticsearch queries (ISO 8601). */
  to: string;
}): Promise<InsightsResult> {
  const allStreams = await streamsClient.listStreams();
  let streams = allStreams;
  if (streamNames !== undefined && streamNames.length > 0) {
    const streamNamesSet = new Set(streamNames);
    streams = allStreams.filter((s) => streamNamesSet.has(s.name));
  }
  logger.debug(
    () =>
      `Generating insights for ${streams.length} streams: ${streams
        .map((stream) => stream.name)
        .join(', ')}`
  );

  const changedQueryIdsByStream = await getChangedQueryIdsByStream({
    queryClient,
    esClient,
    streamNames: streams.map((s) => s.name),
    from,
    to,
    signal,
    logger,
  });

  if (changedQueryIdsByStream.size === 0) {
    logger.debug(`No queries have changes in the time range`);
    return {
      insights: [],
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
    };
  }

  logger.debug(
    () =>
      `Found ${Array.from(changedQueryIdsByStream.values()).reduce(
        (sum, queryIds) => sum + queryIds.size,
        0
      )} queries with changes in the time range`
  );

  const streamInsightsResults = await Promise.all(
    streams
      .filter((stream) => changedQueryIdsByStream.has(stream.name))
      .map(async (stream) => {
        const changedQueryIdsForStream = changedQueryIdsByStream.get(stream.name) ?? new Set();
        const streamInsightResult = await generateStreamInsights({
          stream,
          queryClient,
          esClient,
          inferenceClient,
          signal,
          logger,
          changedQueryIds: changedQueryIdsForStream,
          from,
          to,
        });
        return {
          streamName: stream.name,
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
    logger.debug(`No insights found for any stream`);
    return {
      insights: [],
      tokensUsed,
    };
  }

  try {
    logger.debug(
      () =>
        `Generating insights summary for ${streamInsightsWithData.length} streams:\n` +
        streamInsightsWithData
          .map((result) => `- ${result.streamName}: ${result.insights.length} insights`)
          .join('\n')
    );
    const response = await inferenceClient.prompt({
      prompt: SummarizeStreamsPrompt,
      input: {
        streamInsights: JSON.stringify(streamInsightsWithData),
      },
      abortSignal: signal,
    });

    const insights = extractInsightsFromResponse(response, logger);

    logger.debug(() => `Generated ${insights.length} system insights`);

    return {
      insights,
      tokensUsed: sumTokens(tokensUsed, response.tokens),
    };
  } catch (error) {
    if (
      parseError(error).message.includes(`The request exceeded the model's maximum context length`)
    ) {
      logger.debug(
        `Context too big when generating system insights, number of streams: ${streamInsightsWithData.length}`,
        { error } as LogMeta
      );
      return {
        insights: [],
        tokensUsed,
      };
    }

    throw error;
  }
}

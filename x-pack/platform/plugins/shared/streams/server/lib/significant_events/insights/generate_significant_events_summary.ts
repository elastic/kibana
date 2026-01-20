/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Streams } from '@kbn/streams-schema';
import type { InsightsResult } from '@kbn/streams-schema';
import type { QueryClient } from '../../streams/assets/query/query_client';
import type { StreamsClient } from '../../streams/client';
import { SummarizeQueriesPrompt } from './prompts/summarize_queries/prompt';
import { SummarizeStreamsPrompt } from './prompts/summarize_streams/prompt';
import { extractInsightsFromResponse, collectQueryData, type QueryData } from './utils';

export async function generateSignificantEventsSummary({
  streamsClient,
  queryClient,
  esClient,
  inferenceClient,
  signal,
  logger,
}: {
  streamsClient: StreamsClient;
  queryClient: QueryClient;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
}): Promise<InsightsResult> {
  const streams = await streamsClient.listStreams();
  const streamInsightsResults = await Promise.all(
    streams.map(async (stream) => {
      const streamInsightResult = await generateStreamInsights({
        stream,
        queryClient,
        esClient,
        inferenceClient,
        signal,
        logger,
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

  const tokenUsage = streamInsightsResults.reduce(
    (acc, result) => {
      acc.prompt += result.tokenUsage.prompt;
      acc.completion += result.tokenUsage.completion;
      acc.total += result.tokenUsage.total;
      return acc;
    },
    { prompt: 0, completion: 0, cached: 0, total: 0 }
  );

  // If no stream insights, return empty
  if (streamInsightsWithData.length === 0) {
    return {
      insights: [],
      tokenUsage,
    };
  }

  try {
    const response = await inferenceClient.prompt({
      prompt: SummarizeStreamsPrompt,
      input: {
        streamInsights: JSON.stringify(streamInsightsWithData),
      },
      abortSignal: signal,
    });

    const insights = extractInsightsFromResponse(response, logger);

    return {
      insights: insights ?? [],
      tokenUsage: {
        prompt: tokenUsage.prompt + (response.tokens?.prompt ?? 0),
        completion: tokenUsage.completion + (response.tokens?.completion ?? 0),
        cached: tokenUsage.cached + (response.tokens?.cached ?? 0),
        total: tokenUsage.total + (response.tokens?.total ?? 0),
      },
    };
  } catch (error) {
    if (error.message.includes(`The request exceeded the model's maximum context length`)) {
      logger.debug(
        `Context too big when generating system insights, number of streams: ${streamInsightsWithData.length}`,
        { error }
      );
      return {
        insights: [],
        tokenUsage,
      };
    }

    throw error;
  }
}

async function generateStreamInsights({
  stream,
  queryClient,
  esClient,
  inferenceClient,
  signal,
  logger,
}: {
  stream: Streams.all.Definition;
  queryClient: QueryClient;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
}): Promise<InsightsResult> {
  const queries = await queryClient.getAssets(stream.name);

  const queryDataResults = await Promise.all(
    queries.map((query) =>
      collectQueryData({
        query,
        esClient,
      })
    )
  );

  // Filter out queries with no events
  const queryDataList = queryDataResults.filter((data): data is QueryData => data !== undefined);

  if (queryDataList.length === 0) {
    return {
      insights: [],
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
    };
  }

  try {
    const response = await inferenceClient.prompt({
      prompt: SummarizeQueriesPrompt,
      input: {
        streamName: stream.name,
        queries: JSON.stringify(queryDataList),
      },
      abortSignal: signal,
    });

    const insights = extractInsightsFromResponse(response, logger);

    return {
      insights: insights ?? [],
      tokenUsage: {
        prompt: response.tokens?.prompt ?? 0,
        completion: response.tokens?.completion ?? 0,
        cached: response.tokens?.cached ?? 0,
        total: response.tokens?.total ?? 0,
      },
    };
  } catch (error) {
    if (error.message.includes(`The request exceeded the model's maximum context length`)) {
      logger.debug(
        `Context too big when generating insights for stream ${stream.name}, number of queries: ${queryDataList.length}`,
        { error }
      );
      return {
        insights: [],
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
      };
    }

    throw error;
  }
}

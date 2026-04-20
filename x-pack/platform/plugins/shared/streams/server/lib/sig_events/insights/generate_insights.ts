/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BoundInferenceClient,
  ChatCompletionTokenCount,
  ToolCallback,
  ToolDefinition,
} from '@kbn/inference-common';
import { sumTokens } from '@kbn/streams-ai';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Streams } from '@kbn/streams-schema';
import type { GenerateInsightsResult } from '@kbn/streams-schema';
import type { LogMeta } from '@kbn/logging';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import type { QueryClient } from '../../streams/assets/query/query_client';
import type { StreamsClient } from '../../streams/client';
import { getErrorMessage } from '../../streams/errors/parse_error';
import { createSummarizeQueriesPrompt } from './prompts/summarize_queries/prompt';
import { createSummarizeStreamsPrompt } from './prompts/summarize_streams/prompt';
import { SUBMIT_INSIGHTS_TOOL_NAME } from './client/insight_tool';
import { extractInsightsFromResponse, collectQueryData, type QueryData } from './utils';

export interface InsightsMemoryTools {
  tools: Record<string, ToolDefinition>;
  callbacks: Record<string, ToolCallback>;
  systemPromptSnippet: string;
}

export async function generateInsights({
  streamsClient,
  queryClient,
  esClient,
  inferenceClient,
  signal,
  logger,
  streamNames,
  memoryTools,
}: {
  streamsClient: StreamsClient;
  queryClient: QueryClient;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
  /** When provided, only generate insights for these streams. Otherwise all streams are used. */
  streamNames?: string[];
  memoryTools?: InsightsMemoryTools;
}): Promise<GenerateInsightsResult> {
  const allStreams = await streamsClient.listStreams();
  let streams = allStreams;
  if (streamNames !== undefined && streamNames.length > 0) {
    const streamNamesSet = new Set(streamNames);
    streams = allStreams.filter((s) => streamNamesSet.has(s.name));
  }
  const streamInsightsResults = await Promise.all(
    streams.map(async (stream) => {
      const streamInsightResult = await generateStreamInsights({
        stream,
        queryClient,
        esClient,
        inferenceClient,
        signal,
        logger,
        memoryTools,
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
    (acc, result) => sumTokens(acc, result.tokens_used),
    { prompt: 0, completion: 0, total: 0 }
  );

  // If no stream insights, return empty
  if (streamInsightsWithData.length === 0) {
    return {
      insights: [],
      tokens_used: tokensUsed,
    };
  }

  try {
    const prompt = createSummarizeStreamsPrompt({
      additionalTools: memoryTools?.tools,
      systemPromptSuffix: memoryTools?.systemPromptSnippet,
    });

    const response = await executeAsReasoningAgent({
      prompt,
      input: {
        streamInsights: JSON.stringify(streamInsightsWithData),
      },
      inferenceClient,
      maxSteps: memoryTools ? 4 : 2,
      finalToolChoice: { function: SUBMIT_INSIGHTS_TOOL_NAME },
      toolCallbacks: {
        ...(memoryTools?.callbacks ?? {}),
        [SUBMIT_INSIGHTS_TOOL_NAME]: async (toolCall) => ({
          response: {
            status: 'submitted',
            count: (toolCall.function.arguments as { insights?: unknown[] })?.insights?.length,
          },
        }),
      },
      abortSignal: signal,
    });

    const insights = extractInsightsFromResponse(response, logger);

    return {
      insights,
      tokens_used: sumTokens(tokensUsed, response.tokens),
    };
  } catch (error) {
    if (
      getErrorMessage(error).includes(`The request exceeded the model's maximum context length`)
    ) {
      logger.debug(
        `Context too big when generating system insights, number of streams: ${streamInsightsWithData.length}`,
        { error } as LogMeta
      );
      return {
        insights: [],
        tokens_used: tokensUsed,
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
  memoryTools,
}: {
  stream: Streams.all.Definition;
  queryClient: QueryClient;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
  memoryTools?: InsightsMemoryTools;
}): Promise<GenerateInsightsResult> {
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
      tokens_used: { prompt: 0, completion: 0, total: 0 },
    };
  }

  try {
    const prompt = createSummarizeQueriesPrompt({
      additionalTools: memoryTools?.tools,
      systemPromptSuffix: memoryTools?.systemPromptSnippet,
    });

    const response = await executeAsReasoningAgent({
      prompt,
      input: {
        streamName: stream.name,
        queries: JSON.stringify(queryDataList),
      },
      inferenceClient,
      maxSteps: memoryTools ? 4 : 2,
      finalToolChoice: { function: SUBMIT_INSIGHTS_TOOL_NAME },
      toolCallbacks: {
        ...(memoryTools?.callbacks ?? {}),
        [SUBMIT_INSIGHTS_TOOL_NAME]: async (toolCall) => ({
          response: {
            status: 'submitted',
            count: (toolCall.function.arguments as { insights?: unknown[] })?.insights?.length,
          },
        }),
      },
      abortSignal: signal,
    });

    const insights = extractInsightsFromResponse(response, logger);

    return {
      insights,
      tokens_used: response.tokens ?? { prompt: 0, completion: 0, total: 0 },
    };
  } catch (error) {
    if (
      getErrorMessage(error).includes(`The request exceeded the model's maximum context length`)
    ) {
      logger.debug(
        `Context too big when generating insights for stream ${stream.name}, number of queries: ${queryDataList.length}`,
        { error } as LogMeta
      );
      return {
        insights: [],
        tokens_used: { prompt: 0, completion: 0, total: 0 },
      };
    }

    throw error;
  }
}

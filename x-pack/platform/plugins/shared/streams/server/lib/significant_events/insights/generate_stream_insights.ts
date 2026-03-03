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
import type { LogMeta } from '@kbn/logging';
import { parseError } from '../../streams/errors/parse_error';
import type { QueryClient } from '../../streams/assets/query/query_client';
import { SummarizeQueriesPrompt } from './prompts/summarize_queries/prompt';
import { collectQueryData } from './collect_query_data';
import { extractInsightsFromResponse } from './extract_insights_from_response';

export async function generateStreamInsights({
  stream,
  queryClient,
  esClient,
  inferenceClient,
  signal,
  logger,
  changedQueryIds,
  from,
  to,
}: {
  stream: Streams.all.Definition;
  queryClient: QueryClient;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
  /** Query IDs for this stream that had a change point; only these queries are used for insights. */
  changedQueryIds: Set<string>;
  /** Start of the time range to filter Elasticsearch queries (ISO 8601). */
  from: string;
  /** End of the time range to filter Elasticsearch queries (ISO 8601). */
  to: string;
}): Promise<InsightsResult> {
  const allQueries = await queryClient.getAssets(stream.name);
  const queries = allQueries.filter((q) => changedQueryIds.has(q.query.id));

  const queryDataList = await Promise.all(
    queries.map((query) =>
      collectQueryData({
        query,
        esClient,
        from,
        to,
      })
    )
  );

  try {
    logger.debug(
      () =>
        `Generating insights for stream ${stream.name} using ${queryDataList.length} queries\n` +
        queryDataList
          .map((q) => `- ${q.title}: total=${q.currentCount}, sampled=${q.sampleEvents.length}`)
          .join('\n')
    );

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
      insights,
      tokensUsed: response.tokens ?? { prompt: 0, completion: 0, total: 0 },
    };
  } catch (error) {
    if (
      parseError(error).message.includes(`The request exceeded the model's maximum context length`)
    ) {
      logger.debug(
        `Context too big when generating insights for stream ${stream.name}, number of queries: ${queryDataList.length}`,
        { error } as LogMeta
      );
      return {
        insights: [],
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
      };
    }

    throw error;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import { omit } from 'lodash';
import type { Streams } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import type { Query } from '../../../../common/queries';
import type { QueryClient } from '../../streams/assets/query/query_client';
import { getRuleIdFromQueryLink } from '../../streams/assets/query/helpers/query';
import type { StreamsClient } from '../../streams/client';
import { SecurityError } from '../../streams/errors/security_error';
import { SummarizeQueriesPrompt } from './prompts/summarize_queries/prompt';
import { SummarizeStreamsPrompt } from './prompts/summarize_streams/prompt';

interface QueryData {
  title: string;
  kql: string;
  feature?: {
    name: string;
    filter: Condition;
  };
  currentCount: number;
  sampleEvents: string[];
}

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
}) {
  const streams = await streamsClient.listStreams();
  const streamSummaries = await Promise.all(
    streams.map((stream) =>
      generateStreamSummary({ stream, queryClient, esClient, inferenceClient, signal, logger })
    )
  );

  const tokenUsage = streamSummaries.reduce(
    (acc, summary) => {
      if (summary.tokenUsage) {
        acc.prompt += summary.tokenUsage.prompt;
        acc.completion += summary.tokenUsage.completion;
        acc.cached += summary.tokenUsage.cached ?? 0;
      }
      return acc;
    },
    { prompt: 0, completion: 0, cached: 0 }
  );

  try {
    const response = await inferenceClient.prompt({
      prompt: SummarizeStreamsPrompt,
      input: {
        summaries: streamSummaries.map(({ summary }) => summary).join('\n'),
      },
      abortSignal: signal,
    });

    return {
      summary: response.content,
      tokenUsage: {
        prompt: tokenUsage.prompt + (response.tokens?.prompt ?? 0),
        completion: tokenUsage.completion + (response.tokens?.completion ?? 0),
        cached: tokenUsage.cached + (response.tokens?.cached ?? 0),
      },
    };
  } catch (error) {
    if (error.message.includes(`The request exceeded the model's maximum context length`)) {
      const summary = `Context too big when generating summary for all streams, number of streams: ${streams.length}`;
      logger.debug(summary, { error });
      return {
        summary,
        tokenUsage,
      };
    }

    throw error;
  }
}

async function generateStreamSummary({
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
}) {
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
      summary: `No significant events found in stream ${stream.name}`,
      tokenUsage: { prompt: 0, completion: 0 },
    };
  }

  try {
    const response = await inferenceClient.prompt({
      prompt: SummarizeQueriesPrompt,
      input: {
        streamName: stream.name,
        queries: JSON.stringify(queryDataList, null, 2),
      },
      abortSignal: signal,
    });

    return {
      summary: response.content,
      tokenUsage: {
        prompt: response.tokens?.prompt ?? 0,
        completion: response.tokens?.completion ?? 0,
        cached: response.tokens?.cached ?? 0,
      },
    };
  } catch (error) {
    if (error.message.includes(`The request exceeded the model's maximum context length`)) {
      const summary = `Context too big when generating summary for stream ${stream.name}, number of queries: ${queryDataList.length}`;
      logger.debug(summary, { error });
      return {
        summary,
        tokenUsage: { prompt: 0, completion: 0 },
      };
    }

    throw error;
  }
}

const SAMPLE_EVENTS_COUNT = 5;
const CURRENT_WINDOW_MINUTES = 15;

async function collectQueryData({
  query,
  esClient,
}: {
  query: Query;
  esClient: ElasticsearchClient;
}): Promise<QueryData | undefined> {
  const ruleId = getRuleIdFromQueryLink(query);

  const currentResponse = await esClient
    .search<{ original_source: Record<string, unknown> }>({
      index: '.alerts-streams.alerts-default',
      size: SAMPLE_EVENTS_COUNT,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: `now-${CURRENT_WINDOW_MINUTES}m`,
                  lte: 'now',
                },
              },
            },
            {
              term: {
                'kibana.alert.rule.uuid': ruleId,
              },
            },
          ],
        },
      },
      track_total_hits: true,
    })
    .catch((err) => {
      const isResponseError = err instanceof errors.ResponseError;
      if (isResponseError && err?.body?.error?.type === 'security_exception') {
        throw new SecurityError(
          `Cannot read Significant events, insufficient privileges: ${err.message}`,
          { cause: err }
        );
      }
      throw err;
    });

  const currentCount =
    typeof currentResponse.hits.total === 'number'
      ? currentResponse.hits.total
      : currentResponse.hits.total?.value ?? 0;

  if (currentCount === 0) {
    return undefined;
  }

  const sampleEvents = currentResponse.hits.hits.map((hit) =>
    JSON.stringify(omit(hit._source?.original_source ?? {}, '_id'))
  );

  return {
    title: query.query.title,
    kql: query.query.kql.query,
    feature: query.query.feature
      ? { name: query.query.feature.name, filter: query.query.feature.filter }
      : undefined,
    currentCount,
    sampleEvents,
  };
}

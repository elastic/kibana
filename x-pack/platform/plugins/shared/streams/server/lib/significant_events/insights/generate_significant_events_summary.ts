/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, ChatCompletionTokenCount } from '@kbn/inference-common';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import { omit } from 'lodash';
import type { Streams } from '@kbn/streams-schema';
import type { Query } from '../../../../common/queries';
import type { QueryClient } from '../../streams/assets/query/query_client';
import { getRuleIdFromQueryLink } from '../../streams/assets/query/helpers/query';
import type { StreamsClient } from '../../streams/client';
import { SecurityError } from '../../streams/errors/security_error';
import { SummarizeEventsPrompt } from './prompts/summarize_events/prompt';
import { SummarizeQueriesPrompt } from './prompts/summarize_queries/prompt';
import { SummarizeStreamsPrompt } from './prompts/summarize_streams/prompt';

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
      }
      return acc;
    },
    { prompt: 0, completion: 0 }
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

  const querySummaries = await Promise.all(
    queries.map((query) =>
      generateQuerySummary({
        query,
        streamName: stream.name,
        esClient,
        inferenceClient,
        signal,
        logger,
      })
    )
  );

  const summaries = querySummaries.filter(
    (
      querySummary
    ): querySummary is { summary: string; tokenUsage: ChatCompletionTokenCount | undefined } =>
      querySummary !== undefined
  );

  const tokenUsage = summaries.reduce(
    (acc, summary) => {
      if (summary.tokenUsage) {
        acc.prompt += summary.tokenUsage.prompt;
        acc.completion += summary.tokenUsage.completion;
      }
      return acc;
    },
    { prompt: 0, completion: 0 }
  );

  try {
    const response = await inferenceClient.prompt({
      prompt: SummarizeQueriesPrompt,
      input: {
        streamName: stream.name,
        summaries: summaries.map(({ summary }) => summary).join('\n'),
      },
      abortSignal: signal,
    });

    return {
      summary: response.content,
      tokenUsage: {
        prompt: tokenUsage.prompt + (response.tokens?.prompt ?? 0),
        completion: tokenUsage.completion + (response.tokens?.completion ?? 0),
      },
    };
  } catch (error) {
    if (error.message.includes(`The request exceeded the model's maximum context length`)) {
      const summary = `Context too big when generating query summary for stream ${stream.name}, number of queries: ${summaries.length}`;
      logger.debug(summary, { error });
      return {
        summary,
        tokenUsage,
      };
    }

    throw error;
  }
}

async function generateQuerySummary({
  query,
  streamName,
  esClient,
  inferenceClient,
  signal,
  logger,
}: {
  query: Query;
  streamName: string;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
}) {
  const ruleId = getRuleIdFromQueryLink(query);

  const esResponse = await esClient
    .search<{ original_source: any }>({
      index: '.alerts-streams.alerts-default',
      size: 10_000,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: 'now-15m',
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

  if (esResponse.hits.hits.length === 0) {
    return undefined;
  }

  const events = esResponse.hits.hits.map((hit) =>
    JSON.stringify(omit(hit._source!.original_source, '_id'))
  );

  try {
    const response = await inferenceClient.prompt({
      prompt: SummarizeEventsPrompt,
      input: {
        streamName,
        queryTitle: query.query.title,
        queryKql: query.query.kql.query,
        events: events.join('\n'),
      },
      abortSignal: signal,
    });

    return {
      summary: response.content,
      tokenUsage: response.tokens,
    };
  } catch (error) {
    if (error.message.includes(`The request exceeded the model's maximum context length`)) {
      const summary = `Context too big when generating event summary for stream ${streamName} and query ${query.query.title}, number of events: ${events.length}`;
      logger.debug(summary, { error });
      return {
        summary,
        tokenUsage: undefined,
      };
    }

    throw error;
  }
}

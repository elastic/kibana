/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeDataset, formatDocumentAnalysis, getLogPatterns } from '@kbn/ai-tools';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { Streams, getStreamTypeFromDefinition } from '@kbn/streams-schema';
import { withSpan } from '@kbn/apm-utils';
import { createTracedEsClient } from '@kbn/traced-es-client';
import { StreamSuggestionsPrompt, SUBMIT_SUGGESTIONS_TOOL_NAME } from './prompt';

const LOG_MESSAGE_FIELDS = ['message', 'body.text'];
const MAX_LOG_PATTERNS = 20;

export type StreamSuggestionType =
  | 'improve_parsing'
  | 'partition_stream'
  | 'attach_dashboard'
  | 'reduce_log_volume';

export interface StreamSuggestion {
  type: StreamSuggestionType;
  title: string;
  description: string;
}

export async function generateStreamSuggestions({
  definition,
  start,
  end,
  degradedDocsPct,
  esClient,
  inferenceClient,
  signal,
  logger,
}: {
  definition: Streams.all.Definition;
  start: number;
  end: number;
  /** Pre-computed degraded documents percentage (0–100). */
  degradedDocsPct: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
}): Promise<StreamSuggestion[]> {
  logger.debug(`Generating stream suggestions for stream ${definition.name}`);

  const tracedEsClient = createTracedEsClient({ client: esClient, logger, plugin: 'streams' });

  const [analysis, logPatterns] = await Promise.all([
    withSpan('describe_dataset_for_stream_suggestions', () =>
      describeDataset({ start, end, esClient, index: definition.name })
    ),
    withSpan('get_log_patterns_for_stream_suggestions', () =>
      getLogPatterns({
        esClient: tracedEsClient,
        index: definition.name,
        start,
        end,
        fields: LOG_MESSAGE_FIELDS,
      }).then((patterns) =>
        patterns
          .slice(0, MAX_LOG_PATTERNS)
          .map(({ field, pattern, count, sample }) => ({ field, pattern, count, sample }))
      )
    ),
  ]);

  const formattedAnalysis = formatDocumentAnalysis(analysis, {
    dropEmpty: true,
    dropUnmapped: false,
  });

  const streamType = getStreamTypeFromDefinition(definition);

  const alreadyPartitioned =
    Streams.WiredStream.Definition.is(definition) && definition.ingest.wired.routing.length > 0;

  const degradedPctLabel =
    degradedDocsPct === 0 ? '0% (no degraded documents)' : `${degradedDocsPct.toFixed(2)}%`;

  const response = await withSpan('generate_stream_suggestions', () =>
    inferenceClient.prompt({
      prompt: StreamSuggestionsPrompt,
      input: {
        name: definition.name,
        description: definition.description || 'No description provided.',
        stream_type: streamType,
        already_partitioned: alreadyPartitioned ? 'true' : 'false',
        degraded_docs_pct: degradedPctLabel,
        dataset_analysis: JSON.stringify(formattedAnalysis),
        log_patterns:
          logPatterns.length > 0
            ? JSON.stringify(logPatterns)
            : 'No log patterns detected in the selected time range.',
      },
      abortSignal: signal,
    })
  );

  if (!('toolCalls' in response) || response.toolCalls.length === 0) {
    logger.debug(`No tool calls in suggestions response for stream ${definition.name}`);
    return [];
  }

  const toolCall = response.toolCalls.find(
    (tc) => tc.function.name === SUBMIT_SUGGESTIONS_TOOL_NAME
  );

  if (!toolCall) {
    return [];
  }

  const { suggestions } = toolCall.function.arguments as { suggestions: StreamSuggestion[] };

  logger.debug(
    `Generated ${suggestions.length} suggestion(s) for stream ${definition.name}: ${suggestions
      .map((s) => s.type)
      .join(', ')}`
  );

  return suggestions;
}

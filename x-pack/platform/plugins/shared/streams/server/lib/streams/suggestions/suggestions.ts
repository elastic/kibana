/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Streams } from '@kbn/streams-schema';
import { generateStreamSuggestions, type StreamSuggestion } from '@kbn/streams-ai';
import {
  getDegradedDocCountsForStreams,
  getDocCountsForStreams,
} from '../../../routes/streams/doc_counts/get_streams_doc_counts';

export type { StreamSuggestion };

interface SuggestionsContext {
  esClient: ElasticsearchClient;
  esClientAsSecondaryAuthUser: ElasticsearchClient;
  isServerless: boolean;
  inferenceClient: BoundInferenceClient;
  start: number;
  end: number;
  logger: Logger;
}

export async function getStreamSuggestions(
  definition: Streams.all.Definition,
  context: SuggestionsContext
): Promise<StreamSuggestion[]> {
  const {
    esClient,
    esClientAsSecondaryAuthUser,
    isServerless,
    inferenceClient,
    start,
    end,
    logger,
  } = context;

  const streamName = definition.name;

  const [totalResults, degradedResults] = await Promise.all([
    getDocCountsForStreams({
      isServerless,
      esClient,
      esClientAsSecondaryAuthUser,
      streamName,
    }),
    getDegradedDocCountsForStreams({ esClient, streamName }),
  ]);

  const totalCount = totalResults.find((s) => s.stream === streamName)?.count ?? 0;
  const degradedCount = degradedResults.find((s) => s.stream === streamName)?.count ?? 0;
  const degradedDocsPct = totalCount > 0 ? (degradedCount / totalCount) * 100 : 0;

  return generateStreamSuggestions({
    definition,
    start,
    end,
    degradedDocsPct,
    esClient,
    inferenceClient,
    signal: new AbortController().signal,
    logger,
  });
}

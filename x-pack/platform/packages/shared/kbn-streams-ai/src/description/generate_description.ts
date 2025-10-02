/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Streams, System } from '@kbn/streams-schema';
import { describeDataset, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type BoundInferenceClient } from '@kbn/inference-common';
import { conditionToQueryDsl } from '@kbn/streamlang';
import { GenerateStreamDescriptionPrompt } from './prompt';

/**
 * Generate a natural-language description
 */
export async function generateStreamDescription({
  stream,
  system,
  start,
  end,
  esClient,
  inferenceClient,
}: {
  stream: Streams.all.Definition;
  system?: System;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
}): Promise<string> {
  const analysis = await describeDataset({
    start,
    end,
    esClient,
    index: stream.name,
    filter: system ? conditionToQueryDsl(system.filter) : undefined,
  });

  const response = await inferenceClient.prompt({
    input: {
      name: system?.name || stream.name,
      dataset_analysis: JSON.stringify(
        sortAndTruncateAnalyzedFields(analysis, { dropEmpty: true, dropUnmapped: false })
      ),
    },
    prompt: GenerateStreamDescriptionPrompt,
  });

  return response.content;
}

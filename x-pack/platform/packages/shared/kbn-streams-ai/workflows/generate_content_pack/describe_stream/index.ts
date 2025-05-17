/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { BoundInferenceClient } from '@kbn/inference-common';
import { Streams } from '@kbn/streams-schema';
import { describeDataset, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { DescribeStreamPrompt } from './prompt';

export async function describeStream({
  definition,
  inferenceClient,
  esClient,
  logger,
  start,
  end,
  signal,
}: {
  definition: Streams.ingest.all.Definition;
  inferenceClient: BoundInferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
  start: number;
  end: number;
  signal: AbortSignal;
}): Promise<string> {
  const response = await inferenceClient.prompt({
    prompt: DescribeStreamPrompt,
    abortSignal: signal,
    input: {
      stream: definition,
      dataset_analysis: await describeDataset({
        esClient,
        start,
        end,
        index: definition.name,
      }).then((analysis) => {
        return JSON.stringify(sortAndTruncateAnalyzedFields(analysis, { dropEmpty: true }));
      }),
    },
  });

  const description = response.toolCalls[0]?.function.arguments.description;

  return description;
}

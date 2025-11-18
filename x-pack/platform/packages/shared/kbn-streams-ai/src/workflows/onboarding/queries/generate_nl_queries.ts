/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocumentAnalysis } from '@kbn/ai-tools';
import { formatDocumentAnalysis } from '@kbn/ai-tools';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Streams } from '@kbn/streams-schema';
import type { NaturalLanguageQuery } from './types';
import { GenerateQueriesPrompt } from './prompt';
import { clusterSampleDocs } from '../../../cluster_logs/cluster_sample_docs';

export async function generateNaturalLanguageQueries({
  definition,
  inferenceClient,
  analysis,
  signal,
}: {
  definition: Streams.all.Definition;
  inferenceClient: BoundInferenceClient;
  analysis: DocumentAnalysis;
  signal: AbortSignal;
}): Promise<NaturalLanguageQuery[]> {
  const groupedSamples = JSON.stringify(
    clusterSampleDocs({
      hits: analysis.samples,
      fieldCaps: analysis.fieldCaps,
      dropUnmapped: false,
    })
      .clusters.slice(0, 5)
      .flatMap((cluster) => cluster.samples.slice(0, 3).map((sample) => sample._source))
  );

  const response = await inferenceClient.prompt({
    prompt: GenerateQueriesPrompt,
    input: {
      sample_data: JSON.stringify(
        formatDocumentAnalysis(analysis, { dropEmpty: true, dropUnmapped: false })
      ),
      sample_documents: groupedSamples,
      stream: {
        name: definition.name,
        description: definition.description,
      },
    },
    abortSignal: signal,
  });

  return response.toolCalls.flatMap((toolCall) => {
    return toolCall.function.arguments.queries;
  });
}

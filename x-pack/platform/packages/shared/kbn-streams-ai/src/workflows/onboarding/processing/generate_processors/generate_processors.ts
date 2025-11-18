/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Streams } from '@kbn/streams-schema';
import type { Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { DocumentAnalysis } from '@kbn/ai-tools';
import type { StreamlangProcessorDefinition } from '@kbn/streamlang';
import { clusterSampleDocs } from '../../../../cluster_logs/cluster_sample_docs';
import { callProcessingPrompt } from '../call_processing_prompt';
import { GenerateProcessorsPrompt } from './prompt';
import type { ProcessingService } from '../types';
import { extractGrokPatternInWorker } from '../../patterns/extract_grok_pattern_in_worker';

export async function generateProcessors({
  definition,
  inferenceClient,
  signal,
  logger,
  analysis,
  processing,
}: {
  definition: Streams.ingest.all.Definition;
  inferenceClient: BoundInferenceClient;
  signal: AbortSignal;
  logger: Logger;
  analysis: DocumentAnalysis;
  processing: ProcessingService;
}): Promise<{ analysis: DocumentAnalysis; processors: StreamlangProcessorDefinition[] }> {
  const messageField = ['body.text', 'message'].find((fieldName) =>
    analysis.fields.find(({ name }) => fieldName === name)
  );

  const patternAnalysis = messageField
    ? await extractGrokPatternInWorker({
        analysis,
        messageField,
      })
    : undefined;

  const groupedSamples = JSON.stringify(
    clusterSampleDocs({
      hits: analysis.samples,
      fieldCaps: analysis.fieldCaps,
      dropUnmapped: false,
    })
      .clusters.slice(0, 5)
      .flatMap((cluster) => cluster.samples.slice(0, 3).map((sample) => sample._source))
  );

  const grokPattern = patternAnalysis?.length ? patternAnalysis[0] : undefined;

  const response = await callProcessingPrompt({
    analysis,
    definition,
    inferenceClient,
    logger,
    processing,
    signal,
    prompt: GenerateProcessorsPrompt,
    input: {
      sample_documents: groupedSamples,
      existing_processors: JSON.stringify(definition.ingest.processing),
      pattern_analysis: JSON.stringify({
        grok: grokPattern ?? 'none',
      }),
    },
  });

  return {
    analysis,
    processors: response.processors,
  };
}

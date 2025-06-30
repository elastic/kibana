/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callProcessingPrompt } from '../../../shared/processing/call_processing_prompt';
import { clusterDocs } from '../../../tools/cluster_logs/cluster_logs/cluster_docs';
import { OnboardingTaskContext, OnboardingTaskState } from '../types';
import { schema } from './processing_schema';
import { GenerateProcessorsPrompt } from './prompt';

export async function generateProcessors({
  context,
  context: { logger },
  state,
  state: {
    stream: { definition },
    dataset: { samples, fieldCaps },
  },
}: {
  context: OnboardingTaskContext;
  state: OnboardingTaskState;
}): Promise<OnboardingTaskState> {
  const groupedSamples = JSON.stringify(
    clusterDocs({
      hits: samples,
      fieldCaps,
      logger,
    }).clusters.flatMap((cluster) => cluster.samples.slice(0, 5).map((sample) => sample._source))
  );

  return await callProcessingPrompt({
    context,
    state,
    prompt: GenerateProcessorsPrompt,
    input: {
      sample_documents: groupedSamples,
      existing_processors: JSON.stringify(definition.ingest.processing),
      processor_schema: JSON.stringify(schema),
    },
  });
}

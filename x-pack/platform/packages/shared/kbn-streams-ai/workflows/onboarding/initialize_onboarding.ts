/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { BoundInferenceClient } from '@kbn/inference-common';
import { getSampleDocuments, mergeSampleDocumentsWithFieldCaps } from '@kbn/ai-tools';
import { OnboardingTaskContext, OnboardingTaskState } from './types';

export async function initializeOnboarding({
  name,
  esClient,
  inferenceClient,
  start,
  end,
  logger,
  signal,
  services,
}: {
  name: string;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  start: number;
  end: number;
  logger: Logger;
  signal: AbortSignal;
  services: OnboardingTaskContext['services'];
}): Promise<{
  state: OnboardingTaskState;
  context: OnboardingTaskContext;
}> {
  const [streamsGetResponse, fieldCaps, samplesResponse] = await Promise.all([
    services.streams.getStream(name),
    esClient.fieldCaps({
      index: name,
      fields: '*',
      index_filter: {
        range: {
          '@timestamp': {
            gte: start,
            lte: end,
            format: 'epoch_millis',
          },
        },
      },
    }),
    getSampleDocuments({
      index: name,
      end,
      esClient,
      start,
      _source: true,
      fields: [],
      size: 1000,
      timeout: '5s',
    }),
  ]);

  const samples = samplesResponse.hits;
  const total = samplesResponse.total;

  const analysis = mergeSampleDocumentsWithFieldCaps({
    fieldCaps,
    ...samplesResponse,
  });

  const initialState = {
    stream: {
      definition: streamsGetResponse.stream,
      dashboards: streamsGetResponse.dashboards,
      queries: streamsGetResponse.queries,
    },
    dataset: {
      analysis,
      fieldCaps,
      samples,
      total,
    },
  };

  return {
    context: {
      start,
      end,
      esClient,
      inferenceClient,
      logger,
      signal,
      services,
      initial: initialState,
    },
    state: initialState,
  };
}

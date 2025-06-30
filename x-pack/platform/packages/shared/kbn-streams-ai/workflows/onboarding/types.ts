/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { BoundInferenceClient } from '@kbn/inference-common';
import { Condition, StreamQuery, Streams } from '@kbn/streams-schema';
import { DocumentAnalysis } from '@kbn/ai-tools';
import { FieldCapsResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { ProcessingService } from '../../shared/processing/types';

export interface SuggestedPanel {
  id: string;
  title: string;
  description: string;
  visualization: string;
  query: string;
}

export interface OnboardingTaskState {
  stream: {
    definition: Streams.WiredStream.Definition;
    dashboards: string[];
    queries: StreamQuery[];
  };
  panels?: SuggestedPanel[];
  dataset: {
    samples: SearchHit[];
    analysis: DocumentAnalysis;
    fieldCaps: FieldCapsResponse;
    total: number;
  };
}

interface StreamsService {
  getStream(name: string): Promise<Streams.WiredStream.GetResponse>;
  updateStream(
    name: string,
    request: Streams.WiredStream.UpsertRequest
  ): Promise<{ acknowledged: true }>;
  forkStream(
    name: string,
    to: {
      stream: {
        name: string;
      };
      if: Condition;
    }
  ): Promise<{ acknowledged: true }>;
}

export interface OnboardingTaskContext {
  start: number;
  end: number;
  logger: Logger;
  signal: AbortSignal;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  initial: OnboardingTaskState;
  services: {
    streams: StreamsService;
    processing: ProcessingService;
  };
}

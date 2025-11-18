/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { StreamlangProcessorDefinition } from '@kbn/streamlang';
import type { SimulationResponse, Streams } from '@kbn/streams-schema';
import type { DocumentAnalysis } from '@kbn/ai-tools';
import type {
  StreamWorkflowApplyResult,
  StreamWorkflowGenerateResult,
  StreamWorkflowInput,
  StreamWorkflowResultBase,
} from '../../types';

export interface SampleError {
  source?: Record<string, any>;
  error: {
    message: string;
  };
}

export interface ProcessorValidationResult {
  processor: StreamlangProcessorDefinition & { id: string };
  result: {
    validity: 'success' | 'partial' | 'failure';
    added_fields?: Record<string, Array<string | number | boolean>>;
    failure_rate: number;
    ignored_failure_rate: number;
    success_rate: number;
    successful?: Array<Record<string, any>>;
    errors?: SampleError[];
    ignored_errors?: SampleError[];
  };
  output: SearchHit[];
}

export interface ProcessingService {
  simulate: (
    name: string,
    options: {
      samples: SearchHit[];
      processor: StreamlangProcessorDefinition;
    }
  ) => Promise<SimulationResponse>;
}

export type StreamWorkflowProcessorResult = StreamWorkflowResultBase<{
  processors: StreamlangProcessorDefinition[];
  analysis: DocumentAnalysis;
}>;

export interface OnboardProcessingWorkflowInput
  extends StreamWorkflowInput<Streams.ingest.all.Model> {
  analysis: DocumentAnalysis;
}

export interface OnboardProcessingWorkflowChange {
  processors: StreamlangProcessorDefinition[];
}

export interface OnboardProcessingWorkflowGenerateResult
  extends StreamWorkflowGenerateResult<OnboardProcessingWorkflowChange> {
  analysis: DocumentAnalysis;
}

export type OnboardProcessingWorkflowApplyResult =
  StreamWorkflowApplyResult<Streams.ingest.all.Model>;

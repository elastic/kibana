/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { estypes } from '@elastic/elasticsearch';

export interface PipelineValidationFailureDetail {
  error: string;
  sample: string;
}

export interface PipelineValidationResults {
  success_rate: number;
  successful_samples: number;
  failed_samples: number;
  total_samples: number;
  failure_details: PipelineValidationFailureDetail[];
}

export const FIELD_MAPPING_TYPES = ['keyword', 'long', 'ip', 'date'] as const;
export type FieldMappingType = (typeof FIELD_MAPPING_TYPES)[number];

export interface FieldMapping {
  name: string;
  type: FieldMappingType;
}

const lastValueReducer = <T>(_: T, right: T): T => right;

export const AutomaticImportAgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  current_pipeline: Annotation<estypes.IngestPipeline>({
    reducer: lastValueReducer,
    default: () => ({}),
  }),
  pipeline_generation_results: Annotation<Array<Record<string, unknown>>>({
    reducer: lastValueReducer,
    default: () => [],
  }),
  failure_count: Annotation<number>({
    reducer: lastValueReducer,
    default: () => 0,
  }),
  pipeline_validation_results: Annotation<PipelineValidationResults>({
    reducer: lastValueReducer,
    default: () => ({
      success_rate: 100,
      successful_samples: 0,
      failed_samples: 0,
      total_samples: 0,
      failure_details: [],
    }),
  }),
  analysis: Annotation<string>({
    reducer: lastValueReducer,
    default: () => '',
  }),
  review: Annotation<string>({
    reducer: lastValueReducer,
    default: () => '',
  }),
  field_mappings: Annotation<FieldMapping[]>({
    reducer: lastValueReducer,
    default: () => [],
  }),
});

export type AutomaticImportAgentStateType = typeof AutomaticImportAgentState.State;

/** Partial state updates accepted by `createAutomaticImportAgent(...).invoke()` */
export type AutomaticImportAgentStateUpdateType = typeof AutomaticImportAgentState.Update;

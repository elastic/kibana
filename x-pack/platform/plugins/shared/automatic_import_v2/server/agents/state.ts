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
  pipeline_generation_results: Annotation<estypes.IngestSimulateDocumentResult[]>({
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
});

export type AutomaticImportAgentStateType = typeof AutomaticImportAgentState.State;

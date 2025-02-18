/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestInferenceProcessor } from '@elastic/elasticsearch/lib/api/types';
import type { ADD_INFERENCE_PIPELINE_STEPS } from './constants';

export type AddInferencePipelineSteps =
  (typeof ADD_INFERENCE_PIPELINE_STEPS)[keyof typeof ADD_INFERENCE_PIPELINE_STEPS];

export interface MlInferenceState {
  condition?: string;
  creatingPipeline: boolean;
  error: boolean;
  fieldMap?: IngestInferenceProcessor['field_map'];
  fieldMapError?: string;
  ignoreFailure: boolean;
  inferenceConfig: IngestInferenceProcessor['inference_config'];
  inferenceConfigError?: string;
  modelId: string;
  onFailure?: IngestInferenceProcessor['on_failure'];
  pipelineName: string;
  pipelineNameError?: string;
  pipelineDescription: string;
  pipelineCreated: boolean;
  pipelineError?: string;
  tag?: string;
  targetField: string;
  targetFieldError?: string;
  takeActionOnFailure: boolean;
}

export interface AddInferencePipelineFormErrors {
  targetField?: string;
  fieldMap?: string;
  inferenceConfig?: string;
  pipelineName?: string;
}

export type InferenceModelTypes = 'regression' | 'classification';

export interface AdditionalSettings {
  condition?: string;
  tag?: string;
}

export const TEST_PIPELINE_MODE = {
  STAND_ALONE: 'stand_alone',
  STEP: 'step',
} as const;
export type TestPipelineMode = (typeof TEST_PIPELINE_MODE)[keyof typeof TEST_PIPELINE_MODE];

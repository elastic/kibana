/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IngestInferenceProcessor } from '@elastic/elasticsearch/lib/api/types';
import type { TrainedModelItem } from '../../../../common/types/trained_models';
import { getDefaultOnFailureConfiguration } from '../../components/ml_inference/state';

export interface InferecePipelineCreationState {
  creatingPipeline: boolean;
  error: boolean;
  ignoreFailure: boolean;
  modelId: string;
  onFailure?: IngestInferenceProcessor['on_failure'];
  pipelineName: string;
  pipelineNameError?: string;
  pipelineDescription: string;
  pipelineCreated: boolean;
  pipelineError?: string;
  initialPipelineConfig?: estypes.IngestPipeline;
  takeActionOnFailure: boolean;
}

export const getInitialState = (
  model: TrainedModelItem,
  initialPipelineConfig: estypes.IngestPipeline | undefined
): InferecePipelineCreationState => ({
  creatingPipeline: false,
  error: false,
  ignoreFailure: false,
  modelId: model.model_id,
  onFailure: getDefaultOnFailureConfiguration(),
  pipelineDescription: `Uses the pre-trained model ${model.model_id} to infer against the data that is being ingested in the pipeline`,
  pipelineName: `ml-inference-${model.model_id}`,
  pipelineCreated: false,
  initialPipelineConfig,
  takeActionOnFailure: true,
});

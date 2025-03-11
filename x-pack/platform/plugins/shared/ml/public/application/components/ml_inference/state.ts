/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAnalysisType } from '@kbn/ml-data-frame-analytics-utils';
import type { DFAModelItem } from '../../../../common/types/trained_models';
import type { MlInferenceState } from './types';

export const getModelType = (model: DFAModelItem): string | undefined => {
  const analysisConfig = model.metadata?.analytics_config?.analysis;
  return analysisConfig !== undefined ? getAnalysisType(analysisConfig) : undefined;
};

export const getDefaultOnFailureConfiguration = (): MlInferenceState['onFailure'] => [
  {
    set: {
      description: "Index document to 'failed-<index>'",
      field: '_index',
      value: 'failed-{{{ _index }}}',
    },
  },
  {
    set: {
      field: 'event.timestamp',
      value: '{{{ _ingest.timestamp }}}',
    },
  },
  {
    set: {
      field: 'event.failure.message',
      value: '{{{ _ingest.on_failure_message }}}',
    },
  },
  {
    set: {
      field: 'event.failure.processor_type',
      value: '{{{ _ingest.on_failure_processor_type }}}',
    },
  },
  {
    set: {
      field: 'event.failure.processor_tag',
      value: '{{{ _ingest.on_failure_processor_tag }}}',
    },
  },
  {
    set: {
      field: 'event.failure.pipeline',
      value: '{{{ _ingest.on_failure_pipeline }}}',
    },
  },
];

export const getInitialState = (model: DFAModelItem): MlInferenceState => {
  const modelType = getModelType(model);
  let targetField;

  if (modelType !== undefined) {
    targetField = model.inference_config
      ? `ml.inference.${
          model.inference_config[
            modelType as keyof Exclude<DFAModelItem['inference_config'], undefined>
          ]!.results_field
        }`
      : undefined;
  }

  return {
    condition: undefined,
    creatingPipeline: false,
    error: false,
    fieldMap: undefined,
    ignoreFailure: false,
    inferenceConfig: model.inference_config,
    modelId: model.model_id,
    onFailure: getDefaultOnFailureConfiguration(),
    pipelineDescription: `Uses the pre-trained data frame analytics model ${model.model_id} to infer against the data that is being ingested in the pipeline`,
    pipelineName: `ml-inference-${model.model_id}`,
    pipelineCreated: false,
    tag: undefined,
    takeActionOnFailure: true,
    targetField: targetField ?? '',
  };
};

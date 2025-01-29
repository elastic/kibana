/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlInferenceState } from './types';

export function getPipelineConfig(state: MlInferenceState) {
  const {
    condition,
    fieldMap,
    ignoreFailure,
    inferenceConfig,
    modelId,
    onFailure,
    pipelineDescription,
    tag,
    targetField,
  } = state;
  return {
    description: pipelineDescription,
    processors: [
      {
        inference: {
          model_id: modelId,
          ignore_failure: ignoreFailure,
          ...(targetField && targetField !== '' ? { target_field: targetField } : {}),
          ...(fieldMap && Object.keys(fieldMap).length > 0 ? { field_map: fieldMap } : {}),
          ...(inferenceConfig && Object.keys(inferenceConfig).length > 0
            ? { inference_config: inferenceConfig }
            : {}),
          ...(condition && condition !== '' ? { if: condition } : {}),
          ...(tag && tag !== '' ? { tag } : {}),
          ...(onFailure && Object.keys(onFailure).length > 0 ? { on_failure: onFailure } : {}),
        },
      },
    ],
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELSER_ON_ML_NODE_INFERENCE_ID,
  ELSER_IN_EIS_INFERENCE_ID,
  LEGACY_CUSTOM_INFERENCE_ID,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

export function getMappedInferenceId(
  currentInferenceId: string | undefined,
  availableEndpoints?: InferenceAPIConfigResponse[]
): string | undefined {
  if (currentInferenceId === LEGACY_CUSTOM_INFERENCE_ID) {
    return ELSER_ON_ML_NODE_INFERENCE_ID;
  }

  if (
    currentInferenceId === ELSER_ON_ML_NODE_INFERENCE_ID &&
    availableEndpoints?.some((ep) => ep.inference_id === ELSER_IN_EIS_INFERENCE_ID)
  ) {
    // Show ELSER in EIS in the UI when available
    return ELSER_IN_EIS_INFERENCE_ID;
  }

  return currentInferenceId;
}

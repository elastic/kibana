/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  e5SmallDescription,
  e5SmallTitle,
  elserDescription,
  elserTitle,
  getModelOptionsForInferenceEndpoints,
  ModelOptionsData,
} from './get_model_options_for_inference_endpoints';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import {
  ELSER_ON_ML_NODE_INFERENCE_ID,
  E5_SMALL_INFERENCE_ID,
  ELSER_IN_EIS_INFERENCE_ID,
} from '@kbn/observability-ai-assistant-plugin/public';

describe('getModelOptionsForInferenceEndpoints', () => {
  it('maps known inference endpoints to user-friendly titles and descriptions', () => {
    const endpoints = [
      { inference_id: ELSER_ON_ML_NODE_INFERENCE_ID },
      { inference_id: E5_SMALL_INFERENCE_ID },
    ] as InferenceAPIConfigResponse[];

    const options: ModelOptionsData[] = getModelOptionsForInferenceEndpoints({
      endpoints,
    });

    expect(options).toEqual([
      {
        key: ELSER_ON_ML_NODE_INFERENCE_ID,
        label: elserTitle,
        description: elserDescription,
      },
      {
        key: E5_SMALL_INFERENCE_ID,
        label: e5SmallTitle,
        description: e5SmallDescription,
      },
    ]);
  });

  it('does not show any EIS models if EIS pre-configured endpoints are not available', () => {
    const endpoints = [
      { inference_id: ELSER_ON_ML_NODE_INFERENCE_ID },
      { inference_id: E5_SMALL_INFERENCE_ID },
    ] as InferenceAPIConfigResponse[];

    const options = getModelOptionsForInferenceEndpoints({
      endpoints,
    });

    expect(options.map((o) => o.key)).toEqual([
      ELSER_ON_ML_NODE_INFERENCE_ID,
      E5_SMALL_INFERENCE_ID,
    ]);
  });

  it('does not show any EIS models even if EIS pre-configured endpoints are available', () => {
    const endpoints = [
      { inference_id: ELSER_IN_EIS_INFERENCE_ID },
      { inference_id: ELSER_ON_ML_NODE_INFERENCE_ID },
      { inference_id: E5_SMALL_INFERENCE_ID },
    ] as InferenceAPIConfigResponse[];

    const options = getModelOptionsForInferenceEndpoints({
      endpoints,
    });

    expect(options.map((o) => o.key)).toEqual([
      ELSER_ON_ML_NODE_INFERENCE_ID,
      E5_SMALL_INFERENCE_ID,
    ]);
  });
});

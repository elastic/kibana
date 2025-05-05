/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
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
  DEFAULT_ELSER_INFERENCE_ID,
  E5_SMALL_INFERENCE_ID,
  ELSER_IN_EIS_INFERENCE_ID,
} from '@kbn/observability-ai-assistant-plugin/common';

const samplePreConfiguredInferenceEndpoints = [
  {
    inference_id: DEFAULT_ELSER_INFERENCE_ID,
    task_type: 'sparse_embedding' as InferenceTaskType,
    service: 'elasticsearch',
    service_settings: {
      num_threads: 1,
      model_id: '.elser_model_2_linux-x86_64',
      adaptive_allocations: {
        enabled: true,
        min_number_of_allocations: 0,
        max_number_of_allocations: 32,
      },
    },
  },
  {
    inference_id: E5_SMALL_INFERENCE_ID,
    task_type: 'text_embedding' as InferenceTaskType,
    service: 'elasticsearch',
    service_settings: {
      num_threads: 1,
      model_id: '.multilingual-e5-small_linux-x86_64',
      adaptive_allocations: {
        enabled: true,
        min_number_of_allocations: 0,
        max_number_of_allocations: 32,
      },
    },
  },
] as InferenceAPIConfigResponse[];

describe('getModelOptionsForInferenceEndpoints', () => {
  it('maps known inference endpoints to user-friendly titles and descriptions', () => {
    const options: ModelOptionsData[] = getModelOptionsForInferenceEndpoints({
      endpoints: samplePreConfiguredInferenceEndpoints,
    });

    expect(options).toEqual([
      {
        key: DEFAULT_ELSER_INFERENCE_ID,
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

  it('shows only ELSER in EIS when both ELSER models are available', () => {
    // Include ELSER in EIS
    const endpoints = [
      {
        inference_id: ELSER_IN_EIS_INFERENCE_ID,
        task_type: 'sparse_embedding' as InferenceTaskType,
        service: 'elastic',
        service_settings: {
          model_id: 'elser-v2',
          rate_limit: { requests_per_minute: 1000 },
        },
      },
      ...samplePreConfiguredInferenceEndpoints,
    ] as InferenceAPIConfigResponse[];

    const options = getModelOptionsForInferenceEndpoints({
      endpoints,
    });

    expect(options.map((o) => o.key)).toEqual([ELSER_IN_EIS_INFERENCE_ID, E5_SMALL_INFERENCE_ID]);
  });
});

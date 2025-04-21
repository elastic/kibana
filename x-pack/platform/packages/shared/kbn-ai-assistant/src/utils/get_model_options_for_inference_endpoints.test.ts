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

describe('getModelOptionsForInferenceEndpoints', () => {
  it('maps known inference endpoints to user-friendly titles and descriptions', () => {
    const endpoints = [
      { inference_id: '.elser-2-elasticsearch' },
      { inference_id: '.multilingual-e5-small-elasticsearch' },
    ] as InferenceAPIConfigResponse[];

    const options: ModelOptionsData[] = getModelOptionsForInferenceEndpoints({ endpoints });

    expect(options).toEqual([
      {
        key: '.elser-2-elasticsearch',
        label: elserTitle,
        description: elserDescription,
      },
      {
        key: '.multilingual-e5-small-elasticsearch',
        label: e5SmallTitle,
        description: e5SmallDescription,
      },
    ]);
  });
});

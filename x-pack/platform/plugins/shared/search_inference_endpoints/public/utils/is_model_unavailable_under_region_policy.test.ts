/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EisInferenceEndpoint } from '../../common/types';
import { isModelUnavailableUnderRegionPolicy } from './is_model_unavailable_under_region_policy';

const MODEL_ID = 'test-model';

const createEndpoint = (overrides: Partial<EisInferenceEndpoint> = {}): EisInferenceEndpoint =>
  ({
    inference_id: 'ep-1',
    task_type: 'text_embedding',
    service: 'elastic',
    service_settings: { model_id: MODEL_ID },
    ...overrides,
  } as EisInferenceEndpoint);

describe('isModelUnavailableUnderRegionPolicy', () => {
  it('returns false when the model has no endpoints', () => {
    expect(isModelUnavailableUnderRegionPolicy([], MODEL_ID)).toBe(false);
  });

  it('returns false when denied_by_region_policy is missing', () => {
    expect(isModelUnavailableUnderRegionPolicy([createEndpoint()], MODEL_ID)).toBe(false);
  });

  it('returns false when denied_by_region_policy is false', () => {
    expect(
      isModelUnavailableUnderRegionPolicy(
        [createEndpoint({ metadata: { denied_by_region_policy: false } })],
        MODEL_ID
      )
    ).toBe(false);
  });

  it('returns true when any endpoint for that model is denied by region policy', () => {
    expect(
      isModelUnavailableUnderRegionPolicy(
        [
          createEndpoint({
            inference_id: 'ep-preconfigured',
            metadata: { denied_by_region_policy: true },
          }),
          createEndpoint({ inference_id: 'ep-custom' }),
        ],
        MODEL_ID
      )
    ).toBe(true);
  });

  it('ignores denied_by_region_policy on endpoints for a different model', () => {
    expect(
      isModelUnavailableUnderRegionPolicy(
        [
          createEndpoint({ inference_id: 'ep-this-model' }),
          createEndpoint({
            inference_id: 'ep-other-model',
            service_settings: { model_id: 'other-model' },
            metadata: { denied_by_region_policy: true },
          }),
        ],
        MODEL_ID
      )
    ).toBe(false);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { isImpliedDefaultElserInferenceId } from './is_default_inference_endpoint';

describe('isImpliedDefaultElserInferenceId', () => {
  it('returns true for missing, local, EIS and custom ELSER IDs', () => {
    expect(isImpliedDefaultElserInferenceId(undefined)).toBe(true);
    expect(isImpliedDefaultElserInferenceId(defaultInferenceEndpoints.ELSER)).toBe(true);
    expect(
      isImpliedDefaultElserInferenceId(defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID)
    ).toBe(true);
    expect(isImpliedDefaultElserInferenceId('my-elser-arm')).toBe(true);
  });

  it('returns false for non-ELSER endpoints', () => {
    expect(isImpliedDefaultElserInferenceId(defaultInferenceEndpoints.JINAv5)).toBe(false);
  });
});

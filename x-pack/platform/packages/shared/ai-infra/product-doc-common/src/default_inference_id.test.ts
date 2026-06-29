/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';
import {
  getProductDocInferenceIdCandidates,
  resolveDefaultInferenceId,
  resolveDefaultInferenceIdFromInferenceGet,
  resolveInstalledProductDocInferenceId,
} from './default_inference_id';

describe('resolveDefaultInferenceId', () => {
  it('prefers EIS ELSER when available alongside default ELSER', () => {
    expect(
      resolveDefaultInferenceId(
        new Set([
          defaultInferenceEndpoints.JINAv5,
          defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
          defaultInferenceEndpoints.ELSER,
        ])
      )
    ).toBe(defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID);
  });

  it('prefers EIS ELSER when Jina is unavailable', () => {
    expect(
      resolveDefaultInferenceId(
        new Set([
          defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
          defaultInferenceEndpoints.ELSER,
        ])
      )
    ).toBe(defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID);
  });

  it('falls back to default ELSER', () => {
    expect(resolveDefaultInferenceId(new Set([defaultInferenceEndpoints.ELSER]))).toBe(
      defaultInferenceEndpoints.ELSER
    );
  });
});

describe('getProductDocInferenceIdCandidates', () => {
  it('returns the default first without duplicates', () => {
    expect(getProductDocInferenceIdCandidates(defaultInferenceEndpoints.JINAv5)).toEqual([
      defaultInferenceEndpoints.JINAv5,
      defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
      defaultInferenceEndpoints.ELSER,
    ]);
  });
});

describe('resolveDefaultInferenceIdFromInferenceGet', () => {
  it('falls back to default ELSER when inference lookup fails', async () => {
    await expect(
      resolveDefaultInferenceIdFromInferenceGet(() => Promise.reject(new Error('failed')))
    ).resolves.toBe(defaultInferenceEndpoints.ELSER);
  });
});

describe('resolveInstalledProductDocInferenceId', () => {
  it('returns the first installed candidate inference ID', async () => {
    await expect(
      resolveInstalledProductDocInferenceId({
        getDefaultInferenceId: async () => defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
        isDocumentationAvailable: async (inferenceId) =>
          inferenceId === defaultInferenceEndpoints.ELSER,
      })
    ).resolves.toBe(defaultInferenceEndpoints.ELSER);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AUTOMATIC_IMPORT_RECOMMENDED_ENDPOINTS,
  automaticImportInferenceFeature,
  automaticImportParentInferenceFeature,
} from './inference_feature';

describe('automatic import inference features', () => {
  it('registers the sub-feature under the parent feature', () => {
    expect(automaticImportInferenceFeature.parentFeatureId).toBe(
      automaticImportParentInferenceFeature.featureId
    );
  });

  it('uses the chat_completion task type so EIS chat models can be assigned', () => {
    expect(automaticImportParentInferenceFeature.taskType).toBe('chat_completion');
    expect(automaticImportInferenceFeature.taskType).toBe('chat_completion');
  });

  it('ships recommended chat_completion endpoints on the sub-feature only', () => {
    expect(automaticImportParentInferenceFeature.recommendedEndpoints).toEqual([]);
    expect(automaticImportInferenceFeature.recommendedEndpoints).toBe(
      AUTOMATIC_IMPORT_RECOMMENDED_ENDPOINTS
    );
    expect(AUTOMATIC_IMPORT_RECOMMENDED_ENDPOINTS.length).toBeGreaterThan(0);
    for (const endpointId of AUTOMATIC_IMPORT_RECOMMENDED_ENDPOINTS) {
      expect(endpointId).toMatch(/^\.[a-z0-9.-]+-chat_completion$/);
    }
  });
});

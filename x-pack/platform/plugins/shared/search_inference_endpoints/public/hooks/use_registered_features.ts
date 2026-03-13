/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceFeatureConfig } from '../components/settings/feature_metadata';
import { MOCK_REGISTERED_FEATURES } from '../components/settings/feature_metadata';

/**
 * Returns registered inference features.
 *
 * TODO: replace mock with GET /internal/search_inference_endpoints/features
 * once feature registry PR (#256515) and the features route are merged.
 * The hook signature stays the same — consumers won't need changes.
 */
export const useRegisteredFeatures = (): {
  features: InferenceFeatureConfig[];
  isLoading: boolean;
} => {
  return { features: MOCK_REGISTERED_FEATURES, isLoading: false };
};

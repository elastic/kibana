/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InferenceFeatureConfig } from '@kbn/search-inference-endpoints/server';
import {
  AUTOMATIC_IMPORT_INFERENCE_FEATURE_ID,
  AUTOMATIC_IMPORT_PARENT_INFERENCE_FEATURE_ID,
} from '../common/constants';
import {
  AUTOMATIC_IMPORT_FEATURE_DESCRIPTION,
  AUTOMATIC_IMPORT_FEATURE_NAME,
  AUTOMATIC_IMPORT_PARENT_FEATURE_DESCRIPTION,
  AUTOMATIC_IMPORT_PARENT_FEATURE_NAME,
} from './inference_feature_translations';

export const automaticImportParentInferenceFeature: InferenceFeatureConfig = {
  featureId: AUTOMATIC_IMPORT_PARENT_INFERENCE_FEATURE_ID,
  featureName: AUTOMATIC_IMPORT_PARENT_FEATURE_NAME,
  featureDescription: AUTOMATIC_IMPORT_PARENT_FEATURE_DESCRIPTION,
  taskType: 'completion',
  recommendedEndpoints: [],
};

export const automaticImportInferenceFeature: InferenceFeatureConfig = {
  parentFeatureId: AUTOMATIC_IMPORT_PARENT_INFERENCE_FEATURE_ID,
  featureId: AUTOMATIC_IMPORT_INFERENCE_FEATURE_ID,
  featureName: AUTOMATIC_IMPORT_FEATURE_NAME,
  featureDescription: AUTOMATIC_IMPORT_FEATURE_DESCRIPTION,
  taskType: 'completion',
  recommendedEndpoints: [],
};

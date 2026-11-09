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

// Automatic Import runs a handful of single-pass, quality-sensitive steps per data stream (sample
// analysis, ECS mapping, pipeline generation and repair), so a strong mid-size model is the primary
// recommendation and the frontier models are fallbacks. Order matters: the first available entry is
// what the connector selector picks when no model has been assigned on the Model Settings page.
export const AUTOMATIC_IMPORT_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-5-sonnet-chat_completion', // Claude Sonnet 5, GA 2026-07-03
  '.anthropic-claude-5-opus-chat_completion', // Claude Opus 5, GA 2026-07-24
  '.openai-gpt-5.6-sol-chat_completion', // GPT-5.6 Sol, GA 2026-07-09
];

// The parent is only the section header in the UI and the last rung of the resolution chain, so it
// recommends nothing of its own.
export const automaticImportParentInferenceFeature: InferenceFeatureConfig = {
  featureId: AUTOMATIC_IMPORT_PARENT_INFERENCE_FEATURE_ID,
  featureName: AUTOMATIC_IMPORT_PARENT_FEATURE_NAME,
  featureDescription: AUTOMATIC_IMPORT_PARENT_FEATURE_DESCRIPTION,
  taskType: 'chat_completion',
  recommendedEndpoints: [],
};

export const automaticImportInferenceFeature: InferenceFeatureConfig = {
  parentFeatureId: AUTOMATIC_IMPORT_PARENT_INFERENCE_FEATURE_ID,
  featureId: AUTOMATIC_IMPORT_INFERENCE_FEATURE_ID,
  featureName: AUTOMATIC_IMPORT_FEATURE_NAME,
  featureDescription: AUTOMATIC_IMPORT_FEATURE_DESCRIPTION,
  taskType: 'chat_completion',
  recommendedEndpoints: AUTOMATIC_IMPORT_RECOMMENDED_ENDPOINTS,
};

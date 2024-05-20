/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AssistantSubFeatureId } from '../product_features_keys';
import type { ProductFeatureParams } from '../types';
import { getAssistantBaseKibanaFeature } from './kibana_features';
import {
  getAssistantBaseKibanaSubFeatureIds,
  assistantSubFeaturesMap,
} from './kibana_sub_features';

export const getAssistantFeature = (): ProductFeatureParams<AssistantSubFeatureId> => ({
  baseKibanaFeature: getAssistantBaseKibanaFeature(),
  baseKibanaSubFeatureIds: getAssistantBaseKibanaSubFeatureIds(),
  subFeaturesMap: assistantSubFeaturesMap,
});

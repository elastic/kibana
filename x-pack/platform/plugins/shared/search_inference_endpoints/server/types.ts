/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { FeaturesPluginSetup, FeaturesPluginStart } from '@kbn/features-plugin/server';

export interface InferenceFeatureConfig {
  featureId: string;
  parentFeatureId?: string;
  featureName: string;
  featureDescription: string;
  taskType: string;
  maxNumberOfEndpoints?: number;
  recommendedEndpoints: string[];
}

export interface InferenceFeatureRegistryContract {
  register: (feature: InferenceFeatureConfig) => void;
}

export interface SearchInferenceEndpointsPluginSetup {
  features: InferenceFeatureRegistryContract;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchInferenceEndpointsPluginStart {}

export interface SearchInferenceEndpointsPluginStartDependencies {
  actions: ActionsPluginStartContract;
  features: FeaturesPluginStart;
}

export interface SearchInferenceEndpointsPluginSetupDependencies {
  features: FeaturesPluginSetup;
}

export * from '../common/types';

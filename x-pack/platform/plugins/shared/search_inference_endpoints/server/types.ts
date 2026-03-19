/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { InferenceConnector } from '@kbn/inference-common';

export type { InferenceTaskType, InferenceConnector };

export interface InferenceFeatureConfig {
  featureId: string;
  parentFeatureId?: string;
  featureName: string;
  featureDescription: string;
  taskType: InferenceTaskType;
  maxNumberOfEndpoints?: number;
  recommendedEndpoints: string[];
}

export type RegisterResult = { ok: true; warnings: string[] } | { ok: false; error: string };

export interface InferenceFeatureRegistryStartContract {
  register: (feature: InferenceFeatureConfig) => Promise<RegisterResult>;
  getAll: () => InferenceFeatureConfig[];
  get: (featureId: string) => InferenceFeatureConfig | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchInferenceEndpointsPluginSetup {}

export interface ResolvedInferenceEndpoints {
  endpoints: InferenceConnector[];
  warnings: string[];
}

export interface InferenceEndpointsContract {
  getForFeature: (featureId: string) => Promise<ResolvedInferenceEndpoints>;
}

export interface SearchInferenceEndpointsPluginStart {
  features: InferenceFeatureRegistryStartContract;
  endpoints: InferenceEndpointsContract;
}

export interface SearchInferenceEndpointsPluginStartDependencies {
  actions: ActionsPluginStartContract;
}

export interface SearchInferenceEndpointsPluginSetupDependencies {
  features: FeaturesPluginSetup;
}

export * from '../common/types';

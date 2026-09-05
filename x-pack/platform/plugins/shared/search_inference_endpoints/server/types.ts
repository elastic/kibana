/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { InferenceConnector } from '@kbn/inference-common';
import type { ApiInferenceConnector } from './lib/merge_connectors';

export type { InferenceTaskType, InferenceConnector };

export interface InferenceFeatureConfig {
  featureId: string;
  parentFeatureId?: string;
  featureName: string;
  featureDescription: string;
  taskType: InferenceTaskType;
  maxNumberOfEndpoints?: number;
  recommendedEndpoints: string[];
  isTechPreview?: boolean;
  isBeta?: boolean;
  ignoreGlobalDefault?: boolean;
  visibilityCondition?: {
    key: string;
    value: string | number | boolean | null;
  };
}

export type RegisterResult = { ok: true } | { ok: false; error: string };

export interface InferenceFeatureRegistryContract {
  register: (feature: InferenceFeatureConfig) => RegisterResult;
}

export interface InferenceFeatureRegistryStartContract extends InferenceFeatureRegistryContract {
  getAll: () => InferenceFeatureConfig[];
  get: (featureId: string) => InferenceFeatureConfig | undefined;
}

export interface SearchInferenceEndpointsPluginSetup {
  features: InferenceFeatureRegistryContract;
}

export interface ResolvedInferenceEndpoints {
  endpoints: InferenceConnector[];
  warnings: string[];
  soEntryFound: boolean;
}

export interface ResolvedInferenceApiEndpoints {
  endpoints: ApiInferenceConnector[];
  warnings: string[];
  soEntryFound: boolean;
}

export interface GetForFeatureOptions {
  /**
   * When true, bypasses the global-default-prepend logic in `resolveModelsForFeature` and
   * skips the `KIBANA_DEFAULT_CHAT_COMPLETION` ultimate fallback.
   *
   * - SO overrides and `recommendedEndpoints` are still returned normally.
   * - An empty list signals "nothing explicitly configured for this feature".
   *
   * Use this when the caller wants a clean "nothing configured" signal and
   * handles the fallback itself (e.g. Agent Builder falling back to the
   * user's current execution model).
   */
  onlyReturnConfigured?: boolean;
}

export interface InferenceEndpointsContract {
  getForFeature: (
    featureId: string,
    request: KibanaRequest,
    opts?: GetForFeatureOptions
  ) => Promise<ResolvedInferenceApiEndpoints>;
}

export interface SearchInferenceEndpointsPluginStart {
  features: InferenceFeatureRegistryStartContract;
  endpoints: InferenceEndpointsContract;
}

export interface SearchInferenceEndpointsPluginStartDependencies {
  actions: ActionsPluginStartContract;
  inference: InferenceServerStart;
}

export interface SearchInferenceEndpointsPluginSetupDependencies {
  features: FeaturesPluginSetup;
}

export * from '../common/types';

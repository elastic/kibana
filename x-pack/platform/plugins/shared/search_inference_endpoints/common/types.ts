/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import type {
  ChatCompletionReasoning,
  InferenceConnector,
  EisInferenceEndpointMetadata,
  CspRegion,
} from '@kbn/inference-common';
import { INFERENCE_CONNECTORS_INTERNAL_API_PATH } from '@kbn/inference-common';

export type { CspRegion };

/** Route path constants (const object so imported paths stay type-narrowed as `string`). */
export const APIRoutes = {
  GET_INFERENCE_ENDPOINTS: '/internal/inference_endpoints/endpoints',
  INFERENCE_ENDPOINT: '/internal/inference_endpoint/endpoints/{type}/{id}',
  GET_INFERENCE_SERVICES: 'internal/inference_endpoints/_inference/_services',
  GET_INFERENCE_SETTINGS: '/internal/search_inference_endpoints/settings',
  PUT_INFERENCE_SETTINGS: '/internal/search_inference_endpoints/settings',
  GET_INFERENCE_FEATURES: '/internal/search_inference_endpoints/features',
  GET_INFERENCE_CONNECTORS: INFERENCE_CONNECTORS_INTERNAL_API_PATH,
  // Single path shared by GET, PUT, and DELETE region policy operations
  REGION_POLICY: '/internal/search_inference_endpoints/region_policy',
  TEST_INFERENCE_ENDPOINT: '/internal/search_inference_endpoints/endpoints/{id}/_test',
  TEST_FEATURE: '/internal/search_inference_endpoints/features/{featureId}/_test',
  TEST_CONNECTOR: '/internal/search_inference_endpoints/connectors/{connectorId}/_test',
} as const;

export type TestEndpointFailureCause =
  | 'auth'
  | 'quota'
  | 'timeout'
  | 'not_found'
  | 'bad_request'
  | 'no_endpoint'
  | 'provider_error'
  | 'unknown';

export const TESTABLE_TASK_TYPES = [
  'chat_completion',
  'completion',
  'text_embedding',
  'embedding',
  'sparse_embedding',
  'rerank',
] as const;

export type TestableTaskType = (typeof TESTABLE_TASK_TYPES)[number];

export type TestEndpointResult =
  | { type: 'text'; content: string }
  | { type: 'embedding'; dimensions: number; preview: number[] }
  | {
      type: 'sparse_embedding';
      tokenCount: number;
      topTokens: Array<{ token: string; weight: number }>;
    }
  | { type: 'rerank'; ranking: Array<{ index: number; text: string; score: number }> };

export interface TestEndpointToolCheck {
  passed: boolean;
  toolName: string;
  arguments?: unknown;
  toolResult?: string;
  followUpError?: string;
}

export interface TestEndpointResponse {
  ok: boolean;
  latencyMs: number;
  result?: TestEndpointResult;
  toolCheck?: TestEndpointToolCheck;
  raw?: unknown;
  error?: {
    cause: TestEndpointFailureCause;
    reason: string;
    statusCode?: number;
  };
}

export interface InferenceConnectorsResponse {
  connectors: InferenceConnector[];
}

export interface SearchInferenceEndpointsConfigType {
  ui: {
    enabled: boolean;
  };
}

export interface InferenceEndpointParameters {
  reasoning?: Pick<ChatCompletionReasoning, 'effort'>;
}

export interface InferenceEndpointSetting {
  id: string;
  parameters?: InferenceEndpointParameters;
}

export interface InferenceFeatureSetting {
  feature_id: string;
  endpoints: InferenceEndpointSetting[];
}

export interface InferenceSettingsAttributes {
  features: InferenceFeatureSetting[];
}

export interface InferenceSettingsResponse {
  _meta: {
    id: string;
    createdAt?: string;
    updatedAt?: string;
  };
  data: InferenceSettingsAttributes;
  invalidEndpoints?: string[];
}

export interface InferenceFeaturesResponse {
  features: InferenceFeatureResponse[];
}

export interface InferenceFeatureResponse {
  featureId: string;
  parentFeatureId?: string;
  featureName: string;
  featureDescription: string;
  taskType: string;
  maxNumberOfEndpoints?: number;
  recommendedEndpoints: string[];
  recommendedEndpointParameters?: Record<string, InferenceEndpointParameters>;
  isBeta?: boolean;
  isTechPreview?: boolean;
  ignoreGlobalDefault?: boolean;
  /** When true, Add model lists only endpoints that accept a prompt template. */
  allowTemplateRequiredModels?: boolean;
  visibilityCondition?: {
    key: string;
    value: string | number | boolean | null;
  };
}

export type EisInferenceEndpoint = InferenceAPIConfigResponse & {
  service: 'elastic';
  service_settings: { model_id: string };
  metadata?: EisInferenceEndpointMetadata;
};

export type InferenceEndpointWithMetadata = EisInferenceEndpoint & {
  metadata: EisInferenceEndpointMetadata;
};

export type InferenceEndpointWithDisplayNameMetadata = InferenceEndpointWithMetadata & {
  metadata: {
    display: {
      name: string;
    };
  };
};

export type InferenceEndpointWithDisplayCreatorMetadata = InferenceEndpointWithMetadata & {
  metadata: {
    display: {
      model_creator: string;
    };
  };
};

export interface RegionPolicyBody {
  allowed_regions?: CspRegion[];
  allowed_geos?: string[];
  fallback_region?: CspRegion;
}

export interface RegionPolicyResponse {
  region_policy: RegionPolicyBody;
  created_at: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

export type RegionPolicyConflictRef = string | string[];

export interface RegionPolicyConflictAttributes {
  denied_endpoint_ids: RegionPolicyConflictRef;
  referencing_pipelines?: RegionPolicyConflictRef;
  referencing_indexes?: RegionPolicyConflictRef;
}

export type ReasoningEffortLevel = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

export enum EisModelStatus {
  Preview = 'preview',
  GA = 'ga',
  // metadata status is 'deprecated' OR the end_of_life_date is within the next 30 days
  Deprecated = 'deprecated',
  // The following status are purely for the UI and not directly received from EIS metadata
  // DeprecatedEOL is status: end_of_life_date in the past regardless of status value
  DeprecatedEOL = 'deprecated_eol',
  // Unknown is used when we either don't have a status value in the metadata
  // or we haven't updated our parsing for a new value
  Unknown = 'unknown',
}

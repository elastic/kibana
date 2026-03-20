/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

export enum APIRoutes {
  GET_INFERENCE_ENDPOINTS = '/internal/inference_endpoints/endpoints',
  INFERENCE_ENDPOINT = '/internal/inference_endpoint/endpoints/{type}/{id}',
  GET_INFERENCE_SERVICES = 'internal/inference_endpoints/_inference/_services',
  GET_INFERENCE_SETTINGS = '/internal/search_inference_endpoints/settings',
  PUT_INFERENCE_SETTINGS = '/internal/search_inference_endpoints/settings',
  GET_INFERENCE_FEATURES = '/internal/search_inference_endpoints/features',
}

export interface SearchInferenceEndpointsConfigType {
  ui: {
    enabled: boolean;
  };
}

export interface InferenceEndpointSetting {
  id: string;
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
}

export type InferenceEndpointWithMetadata = InferenceAPIConfigResponse & {
  metadata: {
    heuristics?: {
      properties?: string[];
      status?: string;
      release_date?: string;
      end_of_life_date?: string;
    } & Record<string, unknown>;
    display?: {
      name?: string;
      model_creator?: string;
    } & Record<string, unknown>;
  } & Record<string, unknown>;
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

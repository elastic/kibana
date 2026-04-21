/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from './connectors/connectors';

/**
 * Internal HTTP path for the inference connectors list API (search_inference_endpoints plugin).
 * Kept here so browser clients and the route definition share one source of truth.
 */
export const INFERENCE_CONNECTORS_INTERNAL_API_PATH =
  '/internal/search_inference_endpoints/connectors' as const;

/**
 * Connector entry returned by {@link INFERENCE_CONNECTORS_INTERNAL_API_PATH}.
 * `isRecommended` is set server-side for endpoints that a feature recommends when no
 * saved-object override is configured.
 */
export interface ApiInferenceConnector extends InferenceConnector {
  isRecommended?: boolean;
}

/**
 * Response body shape for {@link INFERENCE_CONNECTORS_INTERNAL_API_PATH}.
 */
export interface InferenceConnectorsApiResponseBody {
  connectors: ApiInferenceConnector[];
  soEntryFound: boolean;
}

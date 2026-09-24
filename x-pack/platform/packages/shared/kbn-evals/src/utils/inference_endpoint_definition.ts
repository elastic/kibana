/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceEndpointRequestBody } from '@kbn/inference-common';

type AddEndpointConfig = InferenceEndpointRequestBody['config'];

export interface InferenceEndpointDefinition
  extends Pick<AddEndpointConfig, 'inferenceId' | 'provider' | 'taskType'>,
    Partial<Pick<AddEndpointConfig, 'providerConfig' | 'taskTypeConfig' | 'headers'>> {
  type: 'inference_endpoint';
  id: string;
  name: string;
  secrets?: Partial<InferenceEndpointRequestBody['secrets']>;
}

const REQUIRED_ENDPOINT_FIELDS = ['inferenceId', 'provider', 'taskType', 'name'] as const;

/**
 * Validates one entry of a `KIBANA_TESTING_INFERENCE_ENDPOINTS` map.
 *
 * Returns an error message when the entry cannot be installed as an inference
 * endpoint, or `undefined` when it is usable. `loadInferenceEndpoints` throws on
 * it at Playwright startup; callers that populate the map from a cache (see
 * `cli/eis_connectors_cache.ts`) reject the same entries up front so a broken
 * cache reports an actionable cache error instead of a startup crash.
 */
export const validateInferenceEndpointEntry = (id: string, def: unknown): string | undefined => {
  if (typeof def !== 'object' || def === null || Array.isArray(def)) {
    return `Inference endpoint "${id}" is missing required field "inferenceId"`;
  }

  const d = def as Record<string, unknown>;
  for (const field of REQUIRED_ENDPOINT_FIELDS) {
    const value = d[field];
    if (typeof value !== 'string' || value.length === 0) {
      return `Inference endpoint "${id}" is missing required field "${field}"`;
    }
  }

  return undefined;
};

/**
 * Loads inference endpoint definitions from `KIBANA_TESTING_INFERENCE_ENDPOINTS`.
 * Accepts base64-encoded JSON or raw JSON. Returns an empty array if the env var is not set.
 */
export function loadInferenceEndpoints(): InferenceEndpointDefinition[] {
  const raw = process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS;
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        'KIBANA_TESTING_INFERENCE_ENDPOINTS is not valid base64-encoded JSON or raw JSON'
      );
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('KIBANA_TESTING_INFERENCE_ENDPOINTS must be a JSON object');
  }

  return Object.entries(parsed as Record<string, unknown>).map(([id, def]) => {
    const error = validateInferenceEndpointEntry(id, def);
    if (error) {
      throw new Error(error);
    }
    return {
      ...(def as Record<string, unknown>),
      id,
      type: 'inference_endpoint',
    } as InferenceEndpointDefinition;
  });
}

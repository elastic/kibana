/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import {
  isInferenceEndpointWithKibanaConnectorHeuristic,
  isInferenceEndpointWithDisplayNameMetadata,
} from './type_guards';

const baseEndpoint = (overrides: Partial<InferenceInferenceEndpointInfo> = {}) =>
  ({
    inference_id: 'id-1',
    task_type: 'chat_completion',
    service: 'elastic',
    ...overrides,
  } as InferenceInferenceEndpointInfo);

describe('isInferenceEndpointWithKibanaConnectorHeuristic', () => {
  it('returns true when heuristics list kibana-connector for chat_completion', () => {
    const endpoint = {
      ...baseEndpoint(),
      metadata: {
        heuristics: { properties: ['kibana-connector'] },
      },
    } as unknown as InferenceInferenceEndpointInfo;

    expect(isInferenceEndpointWithKibanaConnectorHeuristic(endpoint)).toBe(true);
    expect(isInferenceEndpointWithDisplayNameMetadata(endpoint)).toBe(false);
  });

  it('returns false for other task types', () => {
    const endpoint = {
      ...baseEndpoint(),
      task_type: 'text_embedding',
      metadata: {
        heuristics: { properties: ['kibana-connector'] },
      },
    } as unknown as InferenceInferenceEndpointInfo;

    expect(isInferenceEndpointWithKibanaConnectorHeuristic(endpoint)).toBe(false);
  });

  it('returns false when kibana-connector is not listed', () => {
    const endpoint = {
      ...baseEndpoint(),
      metadata: {
        heuristics: { properties: ['other'] },
      },
    } as unknown as InferenceInferenceEndpointInfo;

    expect(isInferenceEndpointWithKibanaConnectorHeuristic(endpoint)).toBe(false);
  });
});

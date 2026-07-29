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
  isCspRegion,
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

describe('isCspRegion', () => {
  it('returns true for a valid object with csp and region strings', () => {
    expect(isCspRegion({ csp: 'aws', region: 'eu-west-1' })).toBe(true);
  });

  it('returns true when optional geo field is also present', () => {
    expect(isCspRegion({ csp: 'gcp', region: 'europe-west1', geo: 'eu' })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isCspRegion(null)).toBe(false);
  });

  it('returns false for a non-object primitive', () => {
    expect(isCspRegion('aws::eu-west-1')).toBe(false);
    expect(isCspRegion(42)).toBe(false);
  });

  it('returns false when csp is missing', () => {
    expect(isCspRegion({ region: 'eu-west-1' })).toBe(false);
  });

  it('returns false when region is missing', () => {
    expect(isCspRegion({ csp: 'aws' })).toBe(false);
  });

  it('returns false when csp is not a string', () => {
    expect(isCspRegion({ csp: 1, region: 'eu-west-1' })).toBe(false);
  });

  it('returns false when region is not a string', () => {
    expect(isCspRegion({ csp: 'aws', region: null })).toBe(false);
  });
});

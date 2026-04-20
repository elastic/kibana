/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import {
  INFERENCE_CONNECTORS_INTERNAL_API_PATH,
  InferenceConnectorType,
  type ApiInferenceConnector,
} from '@kbn/inference-common';
import { fetchConnectorsForFeature } from './fetch_connectors_for_feature';

const inferenceConnector = (connectorId: string): ApiInferenceConnector => ({
  type: InferenceConnectorType.Inference,
  name: connectorId,
  connectorId,
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: false,
});

describe('fetchConnectorsForFeature', () => {
  it('calls the shared internal path with featureId and returns the response as-is', async () => {
    const rec = { ...inferenceConnector('rec'), isRecommended: true };
    const other = inferenceConnector('other');
    const httpGet = jest.fn().mockResolvedValue({
      connectors: [rec, other],
      soEntryFound: false,
    });
    const http = { get: httpGet } as unknown as HttpSetup;

    const result = await fetchConnectorsForFeature(http, 'my-feature');

    expect(httpGet).toHaveBeenCalledTimes(1);
    expect(httpGet).toHaveBeenCalledWith(INFERENCE_CONNECTORS_INTERNAL_API_PATH, {
      query: { featureId: 'my-feature' },
      version: '1',
    });
    expect(result.connectors.map((c) => c.connectorId)).toEqual(['rec', 'other']);
    expect(result.connectors[0].isRecommended).toBe(true);
    expect(result.soEntryFound).toBe(false);
  });

  it('returns SO-configured connectors with soEntryFound true', async () => {
    const a = inferenceConnector('a');
    const httpGet = jest.fn().mockResolvedValue({
      connectors: [a],
      soEntryFound: true,
    });
    const http = { get: httpGet } as unknown as HttpSetup;

    const result = await fetchConnectorsForFeature(http, 'x');

    expect(result.connectors).toEqual([a]);
    expect(result.soEntryFound).toBe(true);
  });
});

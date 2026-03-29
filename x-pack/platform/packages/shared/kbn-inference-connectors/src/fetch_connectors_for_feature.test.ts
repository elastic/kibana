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
  type InferenceConnector,
} from '@kbn/inference-common';
import { fetchConnectorsForFeature } from './fetch_connectors_for_feature';

const inferenceConnector = (connectorId: string): InferenceConnector => ({
  type: InferenceConnectorType.Inference,
  name: connectorId,
  connectorId,
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: false,
});

describe('fetchConnectorsForFeature', () => {
  it('calls the shared internal path with featureId and returns merged connectors with soEntryFound', async () => {
    const rec = inferenceConnector('rec');
    const other = inferenceConnector('other');
    const httpGet = jest.fn().mockResolvedValue({
      connectors: [rec],
      allConnectors: [other, rec],
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
    expect(result.soEntryFound).toBe(false);
  });

  it('returns SO-configured connectors unchanged when soEntryFound is true', async () => {
    const a = inferenceConnector('a');
    const b = inferenceConnector('b');
    const httpGet = jest.fn().mockResolvedValue({
      connectors: [a],
      allConnectors: [a, b],
      soEntryFound: true,
    });
    const http = { get: httpGet } as unknown as HttpSetup;

    const result = await fetchConnectorsForFeature(http, 'x');

    expect(result.connectors).toEqual([a]);
    expect(result.soEntryFound).toBe(true);
  });

  it('returns all connectors with default first when no SO and no recommendations', async () => {
    const a = inferenceConnector('a');
    const b = inferenceConnector('b');
    const httpGet = jest.fn().mockResolvedValue({
      connectors: [],
      allConnectors: [a, b],
      soEntryFound: false,
    });
    const http = { get: httpGet } as unknown as HttpSetup;

    const result = await fetchConnectorsForFeature(http, 'x');

    expect(result.connectors).toEqual([a, b]);
    expect(result.soEntryFound).toBe(false);
  });
});

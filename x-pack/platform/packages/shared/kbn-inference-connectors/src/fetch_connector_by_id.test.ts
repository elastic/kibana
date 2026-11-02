/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { InferenceConnectorType, type InferenceConnector } from '@kbn/inference-common';
import { fetchConnectorById } from './fetch_connector_by_id';

const createInferenceConnector = (
  overrides: Partial<InferenceConnector> = {}
): InferenceConnector => ({
  type: InferenceConnectorType.OpenAI,
  name: 'Test Connector',
  connectorId: 'test-connector-id',
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: false,
  ...overrides,
});

describe('fetchConnectorById', () => {
  it('should call the connector-by-id endpoint and return the mapped AIConnector', async () => {
    const connector = createInferenceConnector({ connectorId: 'my-id', name: 'My Connector' });
    const httpGet = jest.fn().mockResolvedValue({ connector });
    const http = { get: httpGet } as unknown as HttpSetup;

    const result = await fetchConnectorById(http, 'my-id');

    expect(httpGet).toHaveBeenCalledWith('/internal/inference/connectors/my-id');
    expect(result).toBeDefined();
    expect(result!.id).toBe('my-id');
    expect(result!.name).toBe('My Connector');
  });

  it('should encode the connector ID in the URL', async () => {
    const connector = createInferenceConnector({ connectorId: 'id/with/slashes' });
    const httpGet = jest.fn().mockResolvedValue({ connector });
    const http = { get: httpGet } as unknown as HttpSetup;

    await fetchConnectorById(http, 'id/with/slashes');

    expect(httpGet).toHaveBeenCalledWith('/internal/inference/connectors/id%2Fwith%2Fslashes');
  });

  it('should return undefined when the endpoint returns 404', async () => {
    const httpGet = jest.fn().mockRejectedValue({
      response: { status: 404 },
    });
    const http = { get: httpGet } as unknown as HttpSetup;

    const result = await fetchConnectorById(http, 'missing-id');

    expect(result).toBeUndefined();
  });

  it('should rethrow non-404 errors', async () => {
    const httpGet = jest.fn().mockRejectedValue({
      response: { status: 500 },
      message: 'Internal Server Error',
    });
    const http = { get: httpGet } as unknown as HttpSetup;

    await expect(fetchConnectorById(http, 'any-id')).rejects.toEqual({
      response: { status: 500 },
      message: 'Internal Server Error',
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import type { InferenceConnector } from '@kbn/inference-common';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { resolveConnectorIdByFeature } from './resolve_connector_id_by_feature';

const createSearchInferenceEndpointsMock = (
  endpoints: InferenceConnector[] = []
): SearchInferenceEndpointsPluginStart => ({
  features: {} as any,
  endpoints: {
    getForFeature: jest.fn().mockResolvedValue({ endpoints, warnings: [], soEntryFound: false }),
  },
});

describe('resolveConnectorIdByFeature', () => {
  const request = httpServerMock.createKibanaRequest();

  it('returns the first connector configured for the feature', async () => {
    const inference = inferenceMock.createStartContract();
    const searchInferenceEndpoints = createSearchInferenceEndpointsMock([
      { connectorId: 'feature-connector-1' } as InferenceConnector,
      { connectorId: 'feature-connector-2' } as InferenceConnector,
    ]);

    const result = await resolveConnectorIdByFeature({
      featureId: 'significant_events_investigation',
      request,
      inference,
      searchInferenceEndpoints,
    });

    expect(result).toBe('feature-connector-1');
    expect(searchInferenceEndpoints.endpoints.getForFeature).toHaveBeenCalledWith(
      'significant_events_investigation',
      request
    );
    expect(inference.getDefaultConnector).not.toHaveBeenCalled();
  });

  it('falls back to the default connector when the feature has no configured endpoint', async () => {
    const inference = inferenceMock.createStartContract();
    (inference.getDefaultConnector as jest.Mock).mockResolvedValue({
      connectorId: 'default-connector',
    } as InferenceConnector);
    const searchInferenceEndpoints = createSearchInferenceEndpointsMock([]);

    const result = await resolveConnectorIdByFeature({
      featureId: 'unknown_feature',
      request,
      inference,
      searchInferenceEndpoints,
    });

    expect(result).toBe('default-connector');
  });

  it('throws when the feature has no endpoint and there is no default connector', async () => {
    const inference = inferenceMock.createStartContract();
    (inference.getDefaultConnector as jest.Mock).mockResolvedValue(undefined);
    const searchInferenceEndpoints = createSearchInferenceEndpointsMock([]);

    await expect(
      resolveConnectorIdByFeature({
        featureId: 'unknown_feature',
        request,
        inference,
        searchInferenceEndpoints,
      })
    ).rejects.toThrow(
      'No connector configured for feature "unknown_feature" and no default AI connector configured.'
    );
  });
});

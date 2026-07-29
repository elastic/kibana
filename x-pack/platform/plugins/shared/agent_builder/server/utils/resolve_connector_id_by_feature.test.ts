/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { InferenceConnector } from '@kbn/inference-common';
import type {
  InferenceFeatureConfig,
  SearchInferenceEndpointsPluginStart,
} from '@kbn/search-inference-endpoints/server';
import { resolveConnectorIdByFeature } from './resolve_connector_id_by_feature';

const createSearchInferenceEndpointsMock = (
  endpoints: InferenceConnector[] = [],
  feature?: InferenceFeatureConfig
): SearchInferenceEndpointsPluginStart => ({
  features: {
    get: jest.fn().mockReturnValue(feature),
  } as any,
  endpoints: {
    getForFeature: jest.fn().mockResolvedValue({ endpoints, warnings: [], soEntryFound: false }),
  },
});

describe('resolveConnectorIdByFeature', () => {
  const request = httpServerMock.createKibanaRequest();

  it('returns the first connector resolved for the feature', async () => {
    const searchInferenceEndpoints = createSearchInferenceEndpointsMock([
      { connectorId: 'feature-connector-1' } as InferenceConnector,
      { connectorId: 'feature-connector-2' } as InferenceConnector,
    ]);

    const result = await resolveConnectorIdByFeature({
      featureId: 'significant_events_investigation',
      request,
      searchInferenceEndpoints,
    });

    expect(result).toBe('feature-connector-1');
    expect(searchInferenceEndpoints.endpoints.getForFeature).toHaveBeenCalledWith(
      'significant_events_investigation',
      request
    );
  });

  it('throws a clear error when no connector can be resolved for the feature', async () => {
    const searchInferenceEndpoints = createSearchInferenceEndpointsMock([]);

    await expect(
      resolveConnectorIdByFeature({
        featureId: 'unknown_feature',
        request,
        searchInferenceEndpoints,
      })
    ).rejects.toThrow('No connector available for feature "unknown_feature".');
  });

  it('resolves a registered feature whose task type is chat_completion', async () => {
    const searchInferenceEndpoints = createSearchInferenceEndpointsMock(
      [{ connectorId: 'feature-connector-1' } as InferenceConnector],
      { taskType: 'chat_completion' } as InferenceFeatureConfig
    );

    const result = await resolveConnectorIdByFeature({
      featureId: 'agent_builder',
      request,
      searchInferenceEndpoints,
    });

    expect(result).toBe('feature-connector-1');
  });

  it('throws before resolving when the registered feature is not a chat_completion feature', async () => {
    const searchInferenceEndpoints = createSearchInferenceEndpointsMock(
      [{ connectorId: 'feature-connector-1' } as InferenceConnector],
      { taskType: 'text_embedding' } as InferenceFeatureConfig
    );

    await expect(
      resolveConnectorIdByFeature({
        featureId: 'knowledge_base_embeddings',
        request,
        searchInferenceEndpoints,
      })
    ).rejects.toThrow(
      'Feature "knowledge_base_embeddings" is not a chat completion feature (task type "text_embedding"). connector-id-by-feature requires a feature with task type "chat_completion".'
    );
    expect(searchInferenceEndpoints.endpoints.getForFeature).not.toHaveBeenCalled();
  });
});

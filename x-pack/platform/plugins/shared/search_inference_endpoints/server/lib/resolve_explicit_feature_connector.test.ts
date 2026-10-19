/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { InferenceConnector } from '@kbn/inference-common';
import type { SearchInferenceEndpointsPluginStart } from '../types';
import { resolveExplicitFeatureConnectorId } from './resolve_explicit_feature_connector';

const createServices = ({
  endpoints = [],
  soEntryFound = false,
  taskType = 'chat_completion',
  registered = true,
}: {
  endpoints?: InferenceConnector[];
  soEntryFound?: boolean;
  taskType?: string;
  registered?: boolean;
} = {}): SearchInferenceEndpointsPluginStart =>
  ({
    features: {
      get: jest.fn().mockReturnValue(registered ? { taskType } : undefined),
    },
    endpoints: {
      getForFeature: jest.fn().mockResolvedValue({ endpoints, warnings: [], soEntryFound }),
    },
  } as unknown as SearchInferenceEndpointsPluginStart);

describe('resolveExplicitFeatureConnectorId', () => {
  const request = httpServerMock.createKibanaRequest();

  it('returns the connector an operator saved for the feature', async () => {
    const searchInferenceEndpoints = createServices({
      endpoints: [{ connectorId: 'saved-connector' } as InferenceConnector],
      soEntryFound: true,
    });

    const result = await resolveExplicitFeatureConnectorId({
      featureId: 'alertzero_template_models',
      request,
      searchInferenceEndpoints,
    });

    expect(result).toBe('saved-connector');
    expect(searchInferenceEndpoints.endpoints.getForFeature).toHaveBeenCalledWith(
      'alertzero_template_models',
      request,
      { onlyReturnConfigured: true }
    );
  });

  it('ignores recommended endpoints when the operator has not saved a model', async () => {
    const searchInferenceEndpoints = createServices({
      endpoints: [{ connectorId: 'recommended-connector' } as InferenceConnector],
      soEntryFound: false,
    });

    await expect(
      resolveExplicitFeatureConnectorId({
        featureId: 'alertzero_template_models',
        request,
        searchInferenceEndpoints,
      })
    ).resolves.toBeNull();
  });

  it('ignores a saved feature whose endpoint list was cleared', async () => {
    const searchInferenceEndpoints = createServices({ endpoints: [], soEntryFound: true });

    await expect(
      resolveExplicitFeatureConnectorId({
        featureId: 'alertzero_template_models',
        request,
        searchInferenceEndpoints,
      })
    ).resolves.toBeNull();
  });

  it('returns null when the feature is missing or is not a chat completion feature', async () => {
    const missing = createServices({ registered: false });
    const embedding = createServices({ taskType: 'text_embedding', soEntryFound: true });

    await expect(
      resolveExplicitFeatureConnectorId({
        featureId: 'missing',
        request,
        searchInferenceEndpoints: missing,
      })
    ).resolves.toBeNull();
    expect(missing.endpoints.getForFeature).not.toHaveBeenCalled();

    await expect(
      resolveExplicitFeatureConnectorId({
        featureId: 'embed',
        request,
        searchInferenceEndpoints: embedding,
      })
    ).resolves.toBeNull();
    expect(embedding.endpoints.getForFeature).not.toHaveBeenCalled();
  });
});

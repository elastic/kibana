/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { InferenceConnector } from '@kbn/inference-common';
import type { InferenceFeatureConfig, SearchInferenceEndpointsPluginStart } from '../types';
import {
  normalizeConnectorFeatureIds,
  resolveConnectorIdFromFeatures,
} from './resolve_connector_id_from_features';

const CONFLICT = 'connector conflict';

const createServices = (
  get: (featureId: string) => InferenceFeatureConfig | undefined,
  getForFeature: jest.Mock
): SearchInferenceEndpointsPluginStart =>
  ({
    features: { get: jest.fn(get) },
    endpoints: { getForFeature },
  } as unknown as SearchInferenceEndpointsPluginStart);

describe('normalizeConnectorFeatureIds', () => {
  it('keeps a single id and drops blanks from a list', () => {
    expect(normalizeConnectorFeatureIds('  alertzero_frontier  ')).toEqual(['alertzero_frontier']);
    expect(
      normalizeConnectorFeatureIds(['alertzero_template_models', '  ', '', 'alertzero_frontier'])
    ).toEqual(['alertzero_template_models', 'alertzero_frontier']);
  });

  it('returns an empty list for a blank string or non-strings', () => {
    expect(normalizeConnectorFeatureIds('   ')).toEqual([]);
    expect(normalizeConnectorFeatureIds(undefined)).toEqual([]);
    expect(normalizeConnectorFeatureIds([1, null])).toEqual([]);
  });
});

describe('resolveConnectorIdFromFeatures', () => {
  const request = httpServerMock.createKibanaRequest();

  const configuredOptions = { onlyReturnConfigured: true };

  const featureFor = (featureId: string): InferenceFeatureConfig | undefined => {
    if (featureId === 'knowledge_base_embeddings') {
      return { taskType: 'text_embedding' } as InferenceFeatureConfig;
    }
    if (featureId === 'unknown_feature') {
      return undefined;
    }
    return { taskType: 'chat_completion' } as InferenceFeatureConfig;
  };

  it('returns the first configured connector and does not resolve later ids', async () => {
    const getForFeature = jest.fn().mockImplementation(async (featureId: string) => {
      if (featureId === 'alertzero_template_models') {
        return {
          endpoints: [{ connectorId: 'template-connector' } as InferenceConnector],
          warnings: [],
          soEntryFound: true,
        };
      }
      return {
        endpoints: [{ connectorId: 'tier-connector' } as InferenceConnector],
        warnings: [],
        soEntryFound: false,
      };
    });
    const searchInferenceEndpoints = createServices(featureFor, getForFeature);

    const connectorId = await resolveConnectorIdFromFeatures({
      featureIds: ['alertzero_template_models', 'alertzero_frontier'],
      request,
      searchInferenceEndpoints,
      hasExplicitConnector: false,
      conflictMessage: CONFLICT,
    });

    expect(connectorId).toBe('template-connector');
    expect(getForFeature).toHaveBeenCalledWith(
      'alertzero_template_models',
      request,
      configuredOptions
    );
    expect(getForFeature).not.toHaveBeenCalledWith(
      'alertzero_frontier',
      expect.anything(),
      expect.anything()
    );
  });

  it('continues to the next feature when the first row has no configured connector', async () => {
    const getForFeature = jest.fn().mockImplementation(async (featureId: string) => {
      if (featureId === 'alertzero_template_models') {
        return { endpoints: [], warnings: [], soEntryFound: false };
      }
      return {
        endpoints: [{ connectorId: 'tier-connector' } as InferenceConnector],
        warnings: [],
        soEntryFound: false,
      };
    });

    const connectorId = await resolveConnectorIdFromFeatures({
      featureIds: ['alertzero_template_models', 'alertzero_frontier'],
      request,
      searchInferenceEndpoints: createServices(featureFor, getForFeature),
      hasExplicitConnector: false,
      conflictMessage: CONFLICT,
    });

    expect(connectorId).toBe('tier-connector');
    expect(getForFeature).toHaveBeenCalledWith('alertzero_frontier', request, configuredOptions);
  });

  it('returns undefined when every feature misses, even if an explicit connector is set', async () => {
    const getForFeature = jest.fn().mockResolvedValue({
      endpoints: [],
      warnings: [],
      soEntryFound: false,
    });

    await expect(
      resolveConnectorIdFromFeatures({
        featureIds: ['alertzero_template_models', 'alertzero_frontier'],
        request,
        searchInferenceEndpoints: createServices(featureFor, getForFeature),
        hasExplicitConnector: true,
        conflictMessage: CONFLICT,
      })
    ).resolves.toBeUndefined();
    expect(getForFeature).toHaveBeenCalledWith('alertzero_frontier', request, configuredOptions);
  });

  it('conflicts with an explicit connector only when a listed feature resolves one', async () => {
    const getForFeature = jest.fn().mockImplementation(async (featureId: string) => {
      if (featureId === 'alertzero_template_models') {
        return { endpoints: [], warnings: [], soEntryFound: false };
      }
      return {
        endpoints: [{ connectorId: 'tier-connector' } as InferenceConnector],
        warnings: [],
        soEntryFound: false,
      };
    });

    await expect(
      resolveConnectorIdFromFeatures({
        featureIds: ['alertzero_template_models', 'alertzero_frontier'],
        request,
        searchInferenceEndpoints: createServices(featureFor, getForFeature),
        hasExplicitConnector: true,
        conflictMessage: CONFLICT,
      })
    ).rejects.toThrow(CONFLICT);
    expect(getForFeature).toHaveBeenCalledWith('alertzero_frontier', request, configuredOptions);
  });

  it('rejects a feature that is not chat completion before resolving it', async () => {
    const getForFeature = jest.fn();

    await expect(
      resolveConnectorIdFromFeatures({
        featureIds: ['knowledge_base_embeddings'],
        request,
        searchInferenceEndpoints: createServices(featureFor, getForFeature),
        hasExplicitConnector: false,
        conflictMessage: CONFLICT,
      })
    ).rejects.toThrow(
      'Feature "knowledge_base_embeddings" is not a chat completion feature (task type "text_embedding"). connector-id-by-feature requires a feature with task type "chat_completion".'
    );
    expect(getForFeature).not.toHaveBeenCalled();
  });

  it('skips an unregistered id instead of resolving it', async () => {
    const getForFeature = jest.fn().mockResolvedValue({
      endpoints: [{ connectorId: 'default-connector' } as InferenceConnector],
      warnings: [],
      soEntryFound: false,
    });

    const connectorId = await resolveConnectorIdFromFeatures({
      featureIds: ['unknown_feature'],
      request,
      searchInferenceEndpoints: createServices(featureFor, getForFeature),
      hasExplicitConnector: false,
      conflictMessage: CONFLICT,
    });

    expect(connectorId).toBeUndefined();
    expect(getForFeature).not.toHaveBeenCalled();
  });

  it('skips an unregistered leading id when the feature registry is empty, so a standalone connector-id is not a conflict', async () => {
    const getForFeature = jest.fn();
    const emptyRegistry = () => undefined;

    await expect(
      resolveConnectorIdFromFeatures({
        featureIds: ['alertzero_template_models'],
        request,
        searchInferenceEndpoints: createServices(emptyRegistry, getForFeature),
        hasExplicitConnector: true,
        conflictMessage: CONFLICT,
      })
    ).resolves.toBeUndefined();
    expect(getForFeature).not.toHaveBeenCalled();
  });

  it('continues past an unregistered id to the next registered feature', async () => {
    const getForFeature = jest.fn().mockResolvedValue({
      endpoints: [{ connectorId: 'tier-connector' } as InferenceConnector],
      warnings: [],
      soEntryFound: false,
    });

    const connectorId = await resolveConnectorIdFromFeatures({
      featureIds: ['unknown_feature', 'alertzero_frontier'],
      request,
      searchInferenceEndpoints: createServices(featureFor, getForFeature),
      hasExplicitConnector: false,
      conflictMessage: CONFLICT,
    });

    expect(connectorId).toBe('tier-connector');
    expect(getForFeature).toHaveBeenCalledTimes(1);
    expect(getForFeature).toHaveBeenCalledWith('alertzero_frontier', request, configuredOptions);
  });
});

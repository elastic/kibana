/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { AGENT_BUILDER_INFERENCE_FEATURE_ID } from '@kbn/agent-builder-common/constants';
import { InferenceConnectorType, type InferenceConnector } from '@kbn/inference-common';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { resolveExecutionConnectorId } from './resolve_execution_connector_id';

const AGENT_FEATURE_ID = 'my_solution_agent';

const createConnector = (connectorId: string): InferenceConnector => ({
  type: InferenceConnectorType.Inference,
  name: connectorId,
  connectorId,
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: true,
});

const createDeps = ({
  featureEndpoints = [],
  defaultEndpoints = [],
}: {
  featureEndpoints?: string[];
  defaultEndpoints?: string[];
} = {}) => {
  const getForFeature: jest.MockedFn<
    SearchInferenceEndpointsPluginStart['endpoints']['getForFeature']
  > = jest.fn();
  getForFeature.mockImplementation(async (featureId) => ({
    endpoints: (featureId === AGENT_FEATURE_ID ? featureEndpoints : defaultEndpoints).map(
      createConnector
    ),
    warnings: [],
    soEntryFound: false,
  }));
  const searchInferenceEndpoints: SearchInferenceEndpointsPluginStart = {
    features: {
      register: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      updateRecommendedEndpoints: jest.fn(),
    },
    endpoints: { getForFeature },
  };
  const request = httpServerMock.createKibanaRequest();

  return {
    getForFeature,
    request,
    deps: { request, searchInferenceEndpoints },
  };
};

describe('resolveExecutionConnectorId', () => {
  it('returns the explicit connector without resolving any feature', async () => {
    const { deps, getForFeature } = createDeps({ featureEndpoints: ['feature-1'] });

    const result = await resolveExecutionConnectorId({
      ...deps,
      connectorId: 'explicit-1',
      inferenceFeatureId: AGENT_FEATURE_ID,
    });

    expect(result).toEqual({ connectorId: 'explicit-1', source: 'request' });
    expect(getForFeature).not.toHaveBeenCalled();
  });

  it("uses the first configured endpoint of the agent's feature", async () => {
    const { deps, getForFeature, request } = createDeps({
      featureEndpoints: ['feature-1', 'feature-2'],
      defaultEndpoints: ['default-1'],
    });

    const result = await resolveExecutionConnectorId({
      ...deps,
      inferenceFeatureId: AGENT_FEATURE_ID,
    });

    expect(result).toEqual({
      connectorId: 'feature-1',
      connector: createConnector('feature-1'),
      source: 'agent_feature',
    });
    expect(getForFeature).toHaveBeenCalledTimes(1);
    expect(getForFeature).toHaveBeenCalledWith(AGENT_FEATURE_ID, request, {
      onlyReturnConfigured: true,
    });
  });

  it('falls back to the default model when the feature has no model', async () => {
    const { deps, getForFeature, request } = createDeps({
      featureEndpoints: [],
      defaultEndpoints: ['default-1'],
    });

    const result = await resolveExecutionConnectorId({
      ...deps,
      inferenceFeatureId: AGENT_FEATURE_ID,
    });

    expect(result).toEqual({
      connectorId: 'default-1',
      connector: createConnector('default-1'),
      source: 'default',
    });
    expect(getForFeature).toHaveBeenLastCalledWith(AGENT_BUILDER_INFERENCE_FEATURE_ID, request);
  });

  it('uses the default model when the agent declares no feature', async () => {
    const { deps, getForFeature, request } = createDeps({
      defaultEndpoints: ['default-1', 'default-2'],
    });

    const result = await resolveExecutionConnectorId(deps);

    expect(result).toEqual({
      connectorId: 'default-1',
      connector: createConnector('default-1'),
      source: 'default',
    });
    expect(getForFeature).toHaveBeenCalledTimes(1);
    expect(getForFeature).toHaveBeenCalledWith(AGENT_BUILDER_INFERENCE_FEATURE_ID, request);
  });

  it('returns no connector when nothing resolves', async () => {
    const { deps } = createDeps();

    const result = await resolveExecutionConnectorId({
      ...deps,
      inferenceFeatureId: AGENT_FEATURE_ID,
    });

    expect(result).toEqual({ connectorId: undefined, source: 'default' });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import {
  AgentBuilderErrorCode,
  createAgentNotFoundError,
  createAgentUnavailableError,
} from '@kbn/agent-builder-common';
import { AGENT_BUILDER_INFERENCE_FEATURE_ID } from '@kbn/agent-builder-common/constants';
import { InferenceConnectorType, type InferenceConnector } from '@kbn/inference-common';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import {
  createAgentsServiceStartMock,
  createMockedAgentRegistry,
  createMockedInternalAgent,
} from '../../../test_utils/agents';
import { resolveServices } from './resolve_services';

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
  connectorId,
  inferenceFeatureId,
  featureEndpoints = [],
  agentFeatureEndpoints = [],
}: {
  connectorId?: string;
  inferenceFeatureId?: string;
  featureEndpoints?: string[];
  agentFeatureEndpoints?: string[];
} = {}) => {
  const agentRegistry = createMockedAgentRegistry();
  agentRegistry.has.mockResolvedValue(true);
  agentRegistry.get.mockResolvedValue(
    createMockedInternalAgent({
      id: 'private-agent',
      configuration: {
        tools: [],
        ...(inferenceFeatureId !== undefined ? { inference_feature_id: inferenceFeatureId } : {}),
      },
    })
  );
  const agentService = createAgentsServiceStartMock();
  agentService.getRegistry.mockResolvedValue(agentRegistry);
  const getForFeature: jest.MockedFn<
    SearchInferenceEndpointsPluginStart['endpoints']['getForFeature']
  > = jest.fn();
  getForFeature.mockImplementation(async (featureId) => ({
    endpoints: (featureId === AGENT_FEATURE_ID ? agentFeatureEndpoints : featureEndpoints).map(
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

  return {
    agentRegistry,
    getForFeature,
    deps: {
      agentId: 'private-agent',
      connectorId,
      telemetryMetadata: undefined,
      request: httpServerMock.createKibanaRequest(),
      logger: loggingSystemMock.createLogger(),
      inference: inferenceMock.createStartContract(),
      agentService,
      searchInferenceEndpoints,
      security: {} as any,
      elasticsearch: {} as any,
    },
  };
};

describe('resolveServices', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns a 404 Agent Builder error when the scoped user cannot access the agent', async () => {
    const { agentRegistry, deps } = createDeps({ connectorId: 'connector-1' });
    agentRegistry.has.mockResolvedValue(false);

    await expect(resolveServices(deps)).rejects.toMatchObject({
      code: AgentBuilderErrorCode.agentNotFound,
      message: 'Agent "private-agent" not found or not available',
      meta: {
        agentId: 'private-agent',
        statusCode: 404,
      },
    });
  });

  it('returns the same 404 from the single definition lookup when no connector is requested', async () => {
    const { agentRegistry, deps } = createDeps();
    agentRegistry.get.mockRejectedValue(createAgentNotFoundError({ agentId: 'private-agent' }));

    await expect(resolveServices(deps)).rejects.toMatchObject({
      code: AgentBuilderErrorCode.agentNotFound,
      message: 'Agent "private-agent" not found or not available',
      meta: {
        agentId: 'private-agent',
        statusCode: 404,
      },
    });
    expect(agentRegistry.has).not.toHaveBeenCalled();
  });

  it('passes through other errors from the definition lookup', async () => {
    const { agentRegistry, deps } = createDeps();
    const unavailableError = createAgentUnavailableError({ agentId: 'private-agent' });
    agentRegistry.get.mockRejectedValue(unavailableError);

    await expect(resolveServices(deps)).rejects.toBe(unavailableError);
  });

  it('uses the explicit connectorId without resolving the feature endpoints', async () => {
    const { agentRegistry, deps, getForFeature } = createDeps({
      connectorId: 'connector-1',
      inferenceFeatureId: AGENT_FEATURE_ID,
      agentFeatureEndpoints: ['agent-endpoint-1'],
    });

    const { selectedConnectorId } = await resolveServices(deps);

    expect(selectedConnectorId).toBe('connector-1');
    expect(getForFeature).not.toHaveBeenCalled();
    expect(agentRegistry.get).not.toHaveBeenCalled();
  });

  it('uses the first endpoint resolved for the Agent Builder feature', async () => {
    const { deps, getForFeature } = createDeps({
      featureEndpoints: ['endpoint-1', 'endpoint-2'],
    });

    const { selectedConnectorId } = await resolveServices(deps);

    expect(selectedConnectorId).toBe('endpoint-1');
    expect(getForFeature).toHaveBeenCalledWith(AGENT_BUILDER_INFERENCE_FEATURE_ID, deps.request);
  });

  it("uses the first endpoint configured for the agent's inference feature", async () => {
    const { agentRegistry, deps, getForFeature } = createDeps({
      inferenceFeatureId: AGENT_FEATURE_ID,
      agentFeatureEndpoints: ['agent-endpoint-1', 'agent-endpoint-2'],
      featureEndpoints: ['endpoint-1'],
    });

    const { selectedConnectorId } = await resolveServices(deps);

    expect(selectedConnectorId).toBe('agent-endpoint-1');
    expect(agentRegistry.get).toHaveBeenCalledTimes(1);
    expect(agentRegistry.get).toHaveBeenCalledWith('private-agent');
    expect(agentRegistry.has).not.toHaveBeenCalled();
    expect(getForFeature).toHaveBeenCalledTimes(1);
    expect(getForFeature).toHaveBeenCalledWith(AGENT_FEATURE_ID, deps.request, {
      onlyReturnConfigured: true,
    });
  });

  it("falls back to the Agent Builder feature when the agent's feature has no model", async () => {
    const { deps } = createDeps({
      inferenceFeatureId: AGENT_FEATURE_ID,
      featureEndpoints: ['endpoint-1'],
    });

    const { selectedConnectorId } = await resolveServices(deps);

    expect(selectedConnectorId).toBe('endpoint-1');
    expect(deps.logger.warn).toHaveBeenCalledWith(
      `No model available for inference feature "${AGENT_FEATURE_ID}" declared by agent "private-agent", falling back to the default model`
    );
  });

  it('throws when no connector is available', async () => {
    const { deps } = createDeps();

    await expect(resolveServices(deps)).rejects.toThrow(
      'No connector available for chat execution'
    );
  });
});

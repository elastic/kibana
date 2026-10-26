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
import {
  InferenceConnectorType,
  type ChatCompletionReasoningEffort,
  type InferenceConnector,
} from '@kbn/inference-common';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import {
  createAgentsServiceStartMock,
  createMockedAgentRegistry,
  createMockedInternalAgent,
} from '../../../test_utils/agents';
import { resolveServices } from './resolve_services';

const AGENT_FEATURE_ID = 'my_solution_agent';

const createConnector = (
  connectorId: string,
  supportedEffortLevels?: string[]
): InferenceConnector => ({
  type: InferenceConnectorType.Inference,
  name: connectorId,
  connectorId,
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: true,
  ...(supportedEffortLevels
    ? {
        isEis: true,
        metadata: {
          capabilities: { reasoning: { supported_effort_levels: supportedEffortLevels } },
        },
      }
    : {}),
});

const createDeps = ({
  connectorId,
  reasoningLevel,
  inferenceFeatureId,
  agentReasoningLevel,
  supportedEffortLevels,
  featureEndpoints = [],
  agentFeatureEndpoints = [],
}: {
  connectorId?: string;
  reasoningLevel?: ChatCompletionReasoningEffort;
  inferenceFeatureId?: string;
  agentReasoningLevel?: ChatCompletionReasoningEffort;
  supportedEffortLevels?: string[];
  featureEndpoints?: string[];
  agentFeatureEndpoints?: string[];
} = {}) => {
  const agentRegistry = createMockedAgentRegistry();
  agentRegistry.get.mockResolvedValue(
    createMockedInternalAgent({
      id: 'private-agent',
      configuration: {
        tools: [],
        ...(inferenceFeatureId !== undefined ? { inference_feature_id: inferenceFeatureId } : {}),
        ...(agentReasoningLevel !== undefined ? { reasoning_level: agentReasoningLevel } : {}),
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
      (endpointId) => createConnector(endpointId, supportedEffortLevels)
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
  const inference = inferenceMock.createStartContract();
  inference.getConnectorById.mockImplementation(async (id) =>
    createConnector(id, supportedEffortLevels)
  );

  return {
    agentRegistry,
    getForFeature,
    inference,
    deps: {
      agentId: 'private-agent',
      connectorId,
      reasoningLevel,
      telemetryMetadata: undefined,
      request: httpServerMock.createKibanaRequest(),
      logger: loggingSystemMock.createLogger(),
      inference,
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

  it.each([
    { description: 'a connector is requested', connectorId: 'connector-1' },
    { description: 'no connector is requested', connectorId: undefined },
  ])(
    'returns a 404 Agent Builder error when the scoped user cannot access the agent and $description',
    async ({ connectorId }) => {
      const { agentRegistry, deps } = createDeps({ connectorId });
      agentRegistry.get.mockRejectedValue(createAgentNotFoundError({ agentId: 'private-agent' }));

      await expect(resolveServices(deps)).rejects.toMatchObject({
        code: AgentBuilderErrorCode.agentNotFound,
        message: 'Agent "private-agent" not found or not available',
        meta: {
          agentId: 'private-agent',
          statusCode: 404,
        },
      });
    }
  );

  it.each([
    { description: 'a connector is requested', connectorId: 'connector-1' },
    { description: 'no connector is requested', connectorId: undefined },
  ])(
    'passes through other errors from the definition lookup when $description',
    async ({ connectorId }) => {
      const { agentRegistry, deps } = createDeps({ connectorId });
      const unavailableError = createAgentUnavailableError({ agentId: 'private-agent' });
      agentRegistry.get.mockRejectedValue(unavailableError);

      await expect(resolveServices(deps)).rejects.toBe(unavailableError);
    }
  );

  it('uses the explicit connectorId without resolving the feature endpoints', async () => {
    const { agentRegistry, deps, getForFeature } = createDeps({
      connectorId: 'connector-1',
      inferenceFeatureId: AGENT_FEATURE_ID,
      agentFeatureEndpoints: ['agent-endpoint-1'],
    });

    const { selectedConnectorId } = await resolveServices(deps);

    expect(selectedConnectorId).toBe('connector-1');
    expect(getForFeature).not.toHaveBeenCalled();
    expect(agentRegistry.get).toHaveBeenCalledTimes(1);
    expect(agentRegistry.get).toHaveBeenCalledWith('private-agent');
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

  describe('reasoning level', () => {
    it('returns no reasoning level when neither the request nor the agent sets one', async () => {
      const { deps, inference } = createDeps({ featureEndpoints: ['endpoint-1'] });

      const { reasoningLevel } = await resolveServices(deps);

      expect(reasoningLevel).toBeUndefined();
      expect(inference.getConnectorById).not.toHaveBeenCalled();
    });

    it("uses the agent's default when the request sets none", async () => {
      const { deps } = createDeps({
        agentReasoningLevel: 'high',
        supportedEffortLevels: ['low', 'high'],
        featureEndpoints: ['endpoint-1'],
      });

      const { reasoningLevel } = await resolveServices(deps);

      expect(reasoningLevel).toBe('high');
      expect(deps.logger.warn).not.toHaveBeenCalled();
    });

    it("uses the requested level over the agent's default, without checking the model", async () => {
      const { deps, inference } = createDeps({
        connectorId: 'connector-1',
        reasoningLevel: 'low',
        agentReasoningLevel: 'high',
        supportedEffortLevels: ['medium'],
      });

      const { reasoningLevel } = await resolveServices(deps);

      expect(reasoningLevel).toBe('low');
      expect(inference.getConnectorById).not.toHaveBeenCalled();
      expect(deps.logger.warn).not.toHaveBeenCalled();
    });

    it("keeps the agent's default when the model does not advertise its supported levels", async () => {
      const { deps } = createDeps({
        agentReasoningLevel: 'xhigh',
        featureEndpoints: ['endpoint-1'],
      });

      const { reasoningLevel } = await resolveServices(deps);

      expect(reasoningLevel).toBe('xhigh');
    });

    it("drops the agent's default with a warning when the feature's model does not support it", async () => {
      const { deps, inference } = createDeps({
        inferenceFeatureId: AGENT_FEATURE_ID,
        agentReasoningLevel: 'xhigh',
        supportedEffortLevels: ['low', 'high'],
        agentFeatureEndpoints: ['agent-endpoint-1'],
      });

      const { reasoningLevel } = await resolveServices(deps);

      expect(reasoningLevel).toBeUndefined();
      expect(inference.getConnectorById).not.toHaveBeenCalled();
      expect(deps.logger.warn).toHaveBeenCalledWith(
        'Reasoning level "xhigh" declared by agent "private-agent" is not supported by model "agent-endpoint-1" (agent-endpoint-1), running without a reasoning level. Supported levels: low, high.'
      );
    });

    it("drops the agent's default with a warning when the requested connector does not support it", async () => {
      const { deps, inference } = createDeps({
        connectorId: 'connector-1',
        agentReasoningLevel: 'xhigh',
        supportedEffortLevels: ['low', 'high'],
      });

      const { reasoningLevel } = await resolveServices(deps);

      expect(reasoningLevel).toBeUndefined();
      expect(inference.getConnectorById).toHaveBeenCalledWith('connector-1', deps.request);
      expect(deps.logger.warn).toHaveBeenCalledTimes(1);
    });

    it("keeps the agent's default when the requested connector cannot be resolved", async () => {
      const { deps, inference } = createDeps({
        connectorId: 'connector-1',
        agentReasoningLevel: 'high',
      });
      inference.getConnectorById.mockRejectedValue(new Error('not found'));

      const { reasoningLevel } = await resolveServices(deps);

      expect(reasoningLevel).toBe('high');
    });
  });
});

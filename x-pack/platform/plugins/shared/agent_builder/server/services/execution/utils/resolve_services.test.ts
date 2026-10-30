/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  loggingSystemMock,
  securityServiceMock,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import {
  AgentBuilderErrorCode,
  createAgentNotFoundError,
  createAgentUnavailableError,
} from '@kbn/agent-builder-common';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { ModelProvider } from '@kbn/agent-builder-server/runner';
import {
  createAgentsServiceStartMock,
  createMockedAgentRegistry,
  createMockedInternalAgent,
} from '../../../test_utils/agents';
import { createModelProvider } from '../runner/model_provider';
import { resolveServices } from './resolve_services';

jest.mock('../runner/model_provider', () => ({
  createModelProvider: jest.fn(),
}));

const createModelProviderMock = jest.mocked(createModelProvider);

const AGENT_FEATURE_ID = 'my_solution_agent';

const createDeps = ({
  connectorId,
  inferenceFeatureId,
  agentInferenceFeatureId,
}: {
  connectorId?: string;
  inferenceFeatureId?: string;
  agentInferenceFeatureId?: string;
} = {}) => {
  const agentRegistry = createMockedAgentRegistry();
  agentRegistry.get.mockResolvedValue(
    createMockedInternalAgent({
      id: 'private-agent',
      configuration: {
        tools: [],
        ...(agentInferenceFeatureId !== undefined
          ? { inference_feature_id: agentInferenceFeatureId }
          : {}),
      },
    })
  );
  const agentService = createAgentsServiceStartMock();
  agentService.getRegistry.mockResolvedValue(agentRegistry);
  const getForFeature: jest.MockedFn<
    SearchInferenceEndpointsPluginStart['endpoints']['getForFeature']
  > = jest.fn();
  getForFeature.mockResolvedValue({ endpoints: [], warnings: [], soEntryFound: false });
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
      inferenceFeatureId,
      telemetryMetadata: undefined,
      request: httpServerMock.createKibanaRequest(),
      logger: loggingSystemMock.createLogger(),
      inference: inferenceMock.createStartContract(),
      agentService,
      searchInferenceEndpoints,
      security: securityServiceMock.createStart(),
      elasticsearch: elasticsearchServiceMock.createStart(),
    },
  };
};

describe('resolveServices', () => {
  const modelProvider = { getDefaultModel: jest.fn() } as unknown as ModelProvider;

  beforeEach(() => {
    createModelProviderMock.mockReturnValue(modelProvider);
  });

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

  it('returns a connector source for an explicit connectorId without reading the agent feature', async () => {
    const { agentRegistry, deps, getForFeature } = createDeps({
      connectorId: 'connector-1',
      inferenceFeatureId: 'override_feature',
      agentInferenceFeatureId: AGENT_FEATURE_ID,
    });

    const resolved = await resolveServices(deps);

    expect(resolved).toEqual({ modelProvider, defaultModel: { connectorId: 'connector-1' } });
    expect(createModelProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: deps.request,
        defaultModel: { connectorId: 'connector-1' },
      })
    );
    expect(getForFeature).not.toHaveBeenCalled();
    expect(agentRegistry.get).toHaveBeenCalledTimes(1);
    expect(agentRegistry.get).toHaveBeenCalledWith('private-agent');
  });

  it("returns the override feature ahead of the agent's inference_feature_id", async () => {
    const { deps, getForFeature } = createDeps({
      inferenceFeatureId: 'override_feature',
      agentInferenceFeatureId: AGENT_FEATURE_ID,
    });

    const resolved = await resolveServices(deps);

    expect(resolved).toEqual({ modelProvider, defaultModel: { featureId: 'override_feature' } });
    expect(createModelProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({ defaultModel: { featureId: 'override_feature' } })
    );
    expect(getForFeature).not.toHaveBeenCalled();
  });

  it("returns the agent's inference_feature_id as a feature source", async () => {
    const { agentRegistry, deps, getForFeature } = createDeps({
      agentInferenceFeatureId: AGENT_FEATURE_ID,
    });

    const resolved = await resolveServices(deps);

    expect(resolved).toEqual({ modelProvider, defaultModel: { featureId: AGENT_FEATURE_ID } });
    expect(createModelProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({ defaultModel: { featureId: AGENT_FEATURE_ID } })
    );
    expect(agentRegistry.get).toHaveBeenCalledTimes(1);
    expect(agentRegistry.get).toHaveBeenCalledWith('private-agent');
    expect(getForFeature).not.toHaveBeenCalled();
  });

  it('returns no source when neither a connector nor a feature applies and does not call getForFeature', async () => {
    const { deps, getForFeature } = createDeps();

    const resolved = await resolveServices(deps);

    expect(resolved).toEqual({ modelProvider, defaultModel: undefined });
    expect(createModelProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({ defaultModel: undefined })
    );
    expect(getForFeature).not.toHaveBeenCalled();
    expect(deps.logger.warn).not.toHaveBeenCalled();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import { AgentBuilderErrorCode } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_INFERENCE_FEATURE_ID } from '@kbn/agent-builder-common/constants';
import type { InferenceConnector } from '@kbn/inference-common';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import {
  createAgentsServiceStartMock,
  createMockedAgentRegistry,
} from '../../../test_utils/agents';
import { resolveServices } from './resolve_services';

const createDeps = ({
  connectorId,
  featureEndpoints = [],
}: {
  connectorId?: string;
  featureEndpoints?: Array<Pick<InferenceConnector, 'connectorId'>>;
} = {}) => {
  const agentRegistry = createMockedAgentRegistry();
  agentRegistry.has.mockResolvedValue(true);
  const agentService = createAgentsServiceStartMock();
  agentService.getRegistry.mockResolvedValue(agentRegistry);
  const getForFeature = jest.fn().mockResolvedValue({
    endpoints: featureEndpoints,
    warnings: [],
    soEntryFound: false,
  });

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
      conversationService: {} as Parameters<typeof resolveServices>[0]['conversationService'],
      agentService,
      searchInferenceEndpoints: {
        features: {},
        endpoints: { getForFeature },
      } as unknown as SearchInferenceEndpointsPluginStart,
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

  it('uses the explicit connectorId without resolving the feature endpoints', async () => {
    const { deps, getForFeature } = createDeps({ connectorId: 'connector-1' });

    const { selectedConnectorId } = await resolveServices(deps);

    expect(selectedConnectorId).toBe('connector-1');
    expect(getForFeature).not.toHaveBeenCalled();
  });

  it('uses the first endpoint resolved for the Agent Builder feature', async () => {
    const { deps, getForFeature } = createDeps({
      featureEndpoints: [{ connectorId: 'endpoint-1' }, { connectorId: 'endpoint-2' }],
    });

    const { selectedConnectorId } = await resolveServices(deps);

    expect(selectedConnectorId).toBe('endpoint-1');
    expect(getForFeature).toHaveBeenCalledWith(AGENT_BUILDER_INFERENCE_FEATURE_ID, deps.request);
  });

  it('throws when no connector is available', async () => {
    const { deps } = createDeps();

    await expect(resolveServices(deps)).rejects.toThrow(
      'No connector available for chat execution'
    );
  });
});

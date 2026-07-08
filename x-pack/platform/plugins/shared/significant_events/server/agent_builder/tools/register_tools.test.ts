/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { registerAgentBuilderTools } from './register_tools';
import {
  SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID,
  SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID,
  SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID,
  SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID,
} from './register_tools';
import { createMockGetScopedClients } from '../utils/test_helpers';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { EbtTelemetryClient } from '../../lib/telemetry/ebt';

const createMockServer = (): Pick<StreamsServer, 'isServerless' | 'core'> => ({
  isServerless: false,
  core: {
    elasticsearch: { client: { asInternalUser: {} } },
    security: {},
  } as StreamsServer['core'],
});

describe('registerAgentBuilderTools', () => {
  const telemetry = {
    trackAgentBuilderKnowledgeIndicatorCreated: jest.fn(),
  } as unknown as EbtTelemetryClient;

  it('registers all expected tools', () => {
    const agentBuilder = agentBuilderMocks.createSetup();
    const { getScopedClients } = createMockGetScopedClients();

    registerAgentBuilderTools({
      agentBuilder,
      getScopedClients,
      server: createMockServer() as StreamsServer,
      logger: loggerMock.create(),
      telemetry,
    });

    const registeredIds = agentBuilder.tools.register.mock.calls.map((call) => call[0].id);

    expect(registeredIds).toContain(SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID);
    expect(registeredIds).toContain(SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID);
    expect(registeredIds).toContain(SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID);
    expect(registeredIds).toContain(SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID);
    expect(registeredIds).toContain(SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID);
  });

  it('registers tools with non-empty descriptions and schemas', () => {
    const agentBuilder = agentBuilderMocks.createSetup();
    const { getScopedClients } = createMockGetScopedClients();

    registerAgentBuilderTools({
      agentBuilder,
      getScopedClients,
      server: createMockServer() as StreamsServer,
      logger: loggerMock.create(),
      telemetry,
    });

    for (const [tool] of agentBuilder.tools.register.mock.calls) {
      expect(tool.description).toBeTruthy();
      expect(tool).toHaveProperty('schema');
      expect((tool as { schema: unknown }).schema).toBeDefined();
    }
  });

  it('does not register any tools when agentBuilder is falsy', () => {
    const agentBuilder = agentBuilderMocks.createSetup();
    const { getScopedClients } = createMockGetScopedClients();

    registerAgentBuilderTools({
      agentBuilder: undefined!,
      getScopedClients,
      server: createMockServer() as StreamsServer,
      logger: loggerMock.create(),
      telemetry,
    });

    expect(agentBuilder.tools.register).not.toHaveBeenCalled();
  });
});

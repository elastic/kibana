/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import type { GetScopedClients } from '../../../routes/types';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { eventsWriteHandler } from '../event_write/handler';
import { createEventTool, SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('../event_write/handler', () => ({
  eventsWriteHandler: jest.fn(),
}));

describe('event_create tool', () => {
  const telemetry = { trackAgentToolEventCreate: jest.fn() };

  it('uses expected tool id', () => {
    const tool = createEventTool({
      getScopedClients: jest.fn() as unknown as GetScopedClients,
      server: {} as StreamsServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: telemetry as never,
    });

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID);
  });

  it('returns success result', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (eventsWriteHandler as jest.Mock).mockResolvedValue({
      event_uuid: 'e1',
      event_id: 'agent-event-abcd1234',
      status: 'open',
      written: true,
    });

    const getScopedClients = jest.fn().mockResolvedValue({
      getEventClient: jest.fn().mockReturnValue({}),
      licensing: {},
      uiSettingsClient: {},
    });

    const tool = createEventTool({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      server: {} as StreamsServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: telemetry as never,
    });

    const result = await invokeHandler(
      tool as never,
      {
        title: 'T',
        symptom_hypothesis: 'Requests fail because the upstream dependency is unavailable.',
        summary: 'S',
        stream_names: ['logs.a'],
        severity: '60-high',
        confidence: 0.8,
      },
      createMockToolContext()
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
    }
  });
});

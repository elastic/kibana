/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import type { GetScopedClients } from '../../../routes/types';
import type { StreamsServer } from '../../../types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { updateEventStatusToolHandler } from './handler';
import { createEventStatusUpdateTool, STREAMS_EVENT_STATUS_UPDATE_TOOL_ID } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('./handler', () => ({
  updateEventStatusToolHandler: jest.fn(),
}));

describe('event_status_update tool', () => {
  const telemetry = { trackAgentToolEventStatusUpdate: jest.fn() };

  it('uses expected tool id', () => {
    const tool = createEventStatusUpdateTool({
      getScopedClients: jest.fn() as unknown as GetScopedClients,
      server: {} as StreamsServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: telemetry as never,
    });

    expect(tool.id).toBe(STREAMS_EVENT_STATUS_UPDATE_TOOL_ID);
  });

  it('returns success result', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (updateEventStatusToolHandler as jest.Mock).mockResolvedValue({
      event_id: 'e1',
      updated: 1,
      ignored: 0,
      status: 'acknowledged',
    });

    const getScopedClients = jest.fn().mockResolvedValue({
      getEventClient: jest.fn().mockReturnValue({}),
      licensing: {},
      uiSettingsClient: {},
    });

    const tool = createEventStatusUpdateTool({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      server: {} as StreamsServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: telemetry as never,
    });

    const result = await invokeHandler(
      tool as never,
      { event_id: 'e1', status: 'acknowledged' },
      createMockToolContext()
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
    }
  });
});

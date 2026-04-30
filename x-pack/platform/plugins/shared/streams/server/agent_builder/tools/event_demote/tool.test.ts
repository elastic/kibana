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
import { demoteEventToolHandler } from './handler';
import { createDemoteEventTool, STREAMS_DEMOTE_EVENT_TOOL_ID } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('./handler', () => ({
  demoteEventToolHandler: jest.fn(),
}));

describe('event_demote tool', () => {
  const logger = loggingSystemMock.createLogger();
  const server = {} as unknown as StreamsServer;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses expected tool id', () => {
    const getScopedClients = jest.fn() as unknown as jest.MockedFunction<GetScopedClients>;
    const tool = createDemoteEventTool({ getScopedClients, server, logger });

    expect(tool.id).toBe(STREAMS_DEMOTE_EVENT_TOOL_ID);
    expect(tool.id).toBe('platform.streams.sig_events.event_demote');
  });

  it('returns demotion result on success', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (demoteEventToolHandler as jest.Mock).mockResolvedValue({
      event_id: 'event-1',
      demoted: 1,
      ignored: 0,
    });

    const getScopedClients = jest.fn().mockResolvedValue({
      eventsClient: {},
      licensing: {},
      uiSettingsClient: {},
    });

    const tool = createDemoteEventTool({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      server,
      logger,
    });

    const result = await invokeHandler(
      tool as never,
      { event_id: 'event-1' },
      createMockToolContext()
    );

    expect(assertSignificantEventsAccess).toHaveBeenCalled();
    expect(demoteEventToolHandler).toHaveBeenCalledWith({ eventsClient: {}, eventId: 'event-1' });
    expect(result.results[0].type).toBe('other');
  });

  it('returns error result when demotion fails', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (demoteEventToolHandler as jest.Mock).mockRejectedValue(new Error('boom'));

    const getScopedClients = jest.fn().mockResolvedValue({
      eventsClient: {},
      licensing: {},
      uiSettingsClient: {},
    });

    const tool = createDemoteEventTool({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      server,
      logger,
    });

    const result = await invokeHandler(
      tool as never,
      { event_id: 'event-1' },
      createMockToolContext()
    );

    expect(result.results[0].type).toBe('error');
    expect((result.results[0].data as { message: string }).message).toContain(
      'Failed to demote significant event'
    );
  });
});

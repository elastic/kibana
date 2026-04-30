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
import { searchEventsToolHandler } from './handler';
import { createSearchEventsTool, STREAMS_SEARCH_EVENTS_TOOL_ID } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('./handler', () => ({
  searchEventsToolHandler: jest.fn(),
}));

describe('event_search tool', () => {
  const logger = loggingSystemMock.createLogger();
  const server = {} as unknown as StreamsServer;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses expected tool id', () => {
    const getScopedClients = jest.fn() as unknown as jest.MockedFunction<GetScopedClients>;
    const tool = createSearchEventsTool({ getScopedClients, server, logger });

    expect(tool.id).toBe(STREAMS_SEARCH_EVENTS_TOOL_ID);
    expect(tool.id).toBe('platform.streams.sig_events.event_search');
  });

  it('returns events on success', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (searchEventsToolHandler as jest.Mock).mockResolvedValue({ events: [{ id: 'e1' }] });

    const getScopedClients = jest.fn().mockResolvedValue({
      eventsClient: {},
      licensing: {},
      uiSettingsClient: {},
    });

    const tool = createSearchEventsTool({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      server,
      logger,
    });

    const result = await invokeHandler(
      tool as never,
      { query: 'timeout', stream_name: 'logs.checkout', verdict: ['promoted'] },
      createMockToolContext()
    );

    expect(assertSignificantEventsAccess).toHaveBeenCalled();
    expect(searchEventsToolHandler).toHaveBeenCalledWith({
      eventsClient: {},
      params: { query: 'timeout', stream_name: 'logs.checkout', verdict: ['promoted'] },
    });
    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
    }
  });

  it('returns error result when handler fails', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (searchEventsToolHandler as jest.Mock).mockRejectedValue(new Error('boom'));

    const getScopedClients = jest.fn().mockResolvedValue({
      eventsClient: {},
      licensing: {},
      uiSettingsClient: {},
    });

    const tool = createSearchEventsTool({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      server,
      logger,
    });

    const result = await invokeHandler(
      tool as never,
      { query: 'timeout', stream_name: 'logs.checkout' },
      createMockToolContext()
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      expect((result.results[0].data as { message: string }).message).toContain(
        'Failed to search significant events'
      );
    }
  });
});

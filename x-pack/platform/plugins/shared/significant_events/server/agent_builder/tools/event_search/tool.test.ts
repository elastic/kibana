/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { searchEventsToolHandler } from './handler';
import { createSearchEventsTool, SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('./handler', () => ({
  ...jest.requireActual('./handler'),
  searchEventsToolHandler: jest.fn(),
}));

const createMockTelemetry = () => ({
  trackAgentToolEventSearch: jest.fn(),
});

describe('event_search tool', () => {
  it('uses expected tool id', () => {
    const tool = createSearchEventsTool({
      getScopedClients: jest.fn() as unknown as GetScopedClients,
      server: {} as StreamsServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: createMockTelemetry() as never,
    });

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID);
  });

  it('validates bounded filters and normalizes query', () => {
    const tool = createSearchEventsTool({
      getScopedClients: jest.fn() as unknown as GetScopedClients,
      server: {} as StreamsServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: createMockTelemetry() as never,
    });
    if (!('schema' in tool)) {
      throw new Error('Expected a schema-backed tool registration');
    }

    expect(tool.schema.safeParse({ topology_feature_ids: ['checkout-payment'] }).success).toBe(
      true
    );
    expect(
      tool.schema.safeParse({ topology_feature_ids: Array.from({ length: 101 }, (_, i) => `${i}`) })
        .success
    ).toBe(false);
    expect(tool.schema.safeParse({ per_page: 50 }).success).toBe(true);
    expect(tool.schema.safeParse({ per_page: 51 }).success).toBe(false);
    expect(tool.schema.parse({ query: '' }).query).toBeUndefined();
    expect(tool.schema.parse({ query: '  latency  ' }).query).toBe('latency');
  });

  it('returns events on success and tracks telemetry', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (searchEventsToolHandler as jest.Mock).mockResolvedValue({
      events: [{ event_uuid: 'e1' }],
      view: 'compact',
      page: 1,
      total: 1,
    });

    const getScopedClients = jest.fn().mockResolvedValue({
      getEventClient: jest.fn().mockReturnValue({}),
      licensing: {},
      uiSettingsClient: {},
    });
    const telemetry = createMockTelemetry();

    const tool = createSearchEventsTool({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      server: {} as StreamsServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: telemetry as never,
    });

    const result = await invokeHandler(
      tool as never,
      {
        query: '   ',
        stream_names: ['logs.checkout'],
        rule_uuids: ['rule-uuid-1'],
        exclude_unconfirmed_signals: true,
        status: 'open',
      },
      createMockToolContext()
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
    }
    expect(telemetry.trackAgentToolEventSearch).toHaveBeenCalledWith({
      success: true,
      result_count: 1,
      has_query: false,
      has_stream_filter: true,
      status_filter: 'open',
      view: 'compact',
      page: 1,
    });
    expect(searchEventsToolHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          query: undefined,
          rule_uuids: ['rule-uuid-1'],
          exclude_unconfirmed_signals: true,
        }),
      })
    );
  });

  it('accepts cross-stream searches without stream_names', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
    (searchEventsToolHandler as jest.Mock).mockResolvedValue({
      events: [{ event_uuid: 'e2' }],
      view: 'compact',
      page: 1,
      total: 1,
    });

    const getScopedClients = jest.fn().mockResolvedValue({
      getEventClient: jest.fn().mockReturnValue({}),
      licensing: {},
      uiSettingsClient: {},
    });

    const tool = createSearchEventsTool({
      getScopedClients: getScopedClients as unknown as GetScopedClients,
      server: {} as StreamsServer,
      logger: loggingSystemMock.createLogger(),
      telemetry: createMockTelemetry() as never,
    });

    const result = await invokeHandler(
      tool as never,
      { query: 'latency', status: 'closed' },
      createMockToolContext()
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
    }
  });
});

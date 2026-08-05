/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import { createMockToolContext, invokeHandler } from '../../utils/test_helpers';
import { BulkWriteError, MAX_BULK_WRITE_ITEMS } from '../bulk_write';
import { eventsWriteBulkHandler } from './handler';
import { createEventsWriteTool, eventsWriteSchema } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('./handler', () => ({
  eventsWriteBulkHandler: jest.fn(),
}));

const input = {
  event_id: 'event-1',
  discovery_id: 'discovery-1',
  status: 'open' as const,
  stream_names: ['logs.test'],
  title: 'Test event',
  summary: 'Test summary',
  severity: '60-high' as const,
  confidence: 0.8,
};

const createTool = (telemetry: { trackAgentToolEventsWrite: jest.Mock }) => {
  const getScopedClients = jest.fn().mockResolvedValue({
    getEventClient: jest.fn().mockReturnValue({}),
    licensing: {},
  });
  return createEventsWriteTool({
    getScopedClients: getScopedClients as unknown as GetScopedClients,
    server: {} as StreamsServer,
    logger: loggingSystemMock.createLogger(),
    telemetry: telemetry as never,
  });
};

describe('events_write tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
  });

  it('enforces the batch bounds', () => {
    expect(eventsWriteSchema.safeParse({ items: [] }).success).toBe(false);
    expect(
      eventsWriteSchema.safeParse({
        items: Array.from({ length: MAX_BULK_WRITE_ITEMS + 1 }, () => input),
      }).success
    ).toBe(false);
  });

  it('returns aligned results and tracks each item', async () => {
    (eventsWriteBulkHandler as jest.Mock).mockResolvedValue([
      {
        index: 0,
        event_uuid: 'uuid-1',
        event_id: 'event-1',
        status: 'open',
        written: true,
      },
      {
        index: 1,
        event_id: 'event-2',
        status: 'closed',
        written: false,
        reason: 'bulk_error',
        error: { type: 'rejected', reason: 'busy', status: 429 },
      },
    ]);
    const telemetry = { trackAgentToolEventsWrite: jest.fn() };
    const result = await invokeHandler(
      createTool(telemetry) as never,
      { items: [input, { ...input, event_id: 'event-2', status: 'closed' }] },
      createMockToolContext()
    );

    expect(result).toEqual(
      expect.objectContaining({
        results: [expect.objectContaining({ type: 'other', data: { results: expect.any(Array) } })],
      })
    );
    expect(telemetry.trackAgentToolEventsWrite).toHaveBeenCalledTimes(2);
    expect(telemetry.trackAgentToolEventsWrite).toHaveBeenLastCalledWith(
      expect.objectContaining({ success: false, written: false, error_message: 'busy' })
    );
  });

  it('does not replace successful results when telemetry throws', async () => {
    (eventsWriteBulkHandler as jest.Mock).mockResolvedValue([
      {
        index: 0,
        event_uuid: 'uuid-1',
        event_id: 'event-1',
        status: 'open',
        written: true,
      },
    ]);
    const telemetry = {
      trackAgentToolEventsWrite: jest.fn().mockImplementation(() => {
        throw new Error('telemetry unavailable');
      }),
    };

    const result = await invokeHandler(
      createTool(telemetry) as never,
      { items: [input] },
      createMockToolContext()
    );

    expect(result).toEqual(
      expect.objectContaining({ results: [expect.objectContaining({ type: 'other' })] })
    );
  });

  it('returns a classified validation error', async () => {
    (eventsWriteBulkHandler as jest.Mock).mockRejectedValue(
      new BulkWriteError('validation_error', 'duplicate event_id')
    );
    const result = await invokeHandler(
      createTool({ trackAgentToolEventsWrite: jest.fn() }) as never,
      { items: [input] },
      createMockToolContext()
    );

    expect(result).toEqual(
      expect.objectContaining({
        results: [
          expect.objectContaining({
            type: 'error',
            data: expect.objectContaining({ code: 'validation_error', retryable: false }),
          }),
        ],
      })
    );
  });
});

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
import { discoveryWriteBulkHandler, type DiscoveryWriteInput } from './handler';
import { createDiscoveryWriteTool, discoveryWriteSchema } from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

jest.mock('./handler', () => ({
  discoveryWriteBulkHandler: jest.fn(),
}));

const input = {
  kind: 'discovery',
  title: 'Test discovery',
  summary: 'Test summary',
  stream_names: ['logs.test'],
  severity: '60-high',
  confidence: 0.8,
  signals: [],
} satisfies DiscoveryWriteInput;

const createTool = (telemetry: { trackAgentToolDiscoveryWrite: jest.Mock }) => {
  const getScopedClients = jest.fn().mockResolvedValue({
    getDiscoveryClient: jest.fn().mockReturnValue({}),
    licensing: {},
  });
  return createDiscoveryWriteTool({
    getScopedClients: getScopedClients as unknown as GetScopedClients,
    server: {} as StreamsServer,
    logger: loggingSystemMock.createLogger(),
    telemetry: telemetry as never,
  });
};

describe('discovery_write tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValue(undefined);
  });

  it('enforces the batch bounds and applies the nested dedup default', () => {
    expect(discoveryWriteSchema.safeParse({ items: [] }).success).toBe(false);
    expect(
      discoveryWriteSchema.safeParse({
        items: Array.from({ length: MAX_BULK_WRITE_ITEMS + 1 }, () => input),
      }).success
    ).toBe(false);
    const parsed = discoveryWriteSchema.parse({ items: [input] });
    expect(parsed.items[0].dedup_window).toBe('now-1h');
  });

  it('tracks writes, duplicates, and failures with their distinct outcomes', async () => {
    (discoveryWriteBulkHandler as jest.Mock).mockResolvedValue([
      {
        index: 0,
        discovery_id: 'discovery-1',
        event_id: 'event-1',
        kind: 'discovery',
        written: true,
      },
      {
        index: 1,
        discovery_id: 'existing',
        event_id: 'event-2',
        kind: 'discovery',
        written: false,
        skipped: true,
        reason: 'duplicate_within_window',
        existing_discovery_id: 'existing',
      },
      {
        index: 2,
        discovery_id: 'discovery-3',
        event_id: 'event-3',
        kind: 'discovery',
        written: false,
        reason: 'bulk_error',
        error: { type: 'rejected', reason: 'busy', status: 429 },
      },
    ]);
    const telemetry = { trackAgentToolDiscoveryWrite: jest.fn() };
    const result = await invokeHandler(
      createTool(telemetry) as never,
      { items: [input, { ...input, title: 'Two' }, { ...input, title: 'Three' }] },
      createMockToolContext()
    );

    expect(result).toEqual(
      expect.objectContaining({ results: [expect.objectContaining({ type: 'other' })] })
    );
    expect(telemetry.trackAgentToolDiscoveryWrite).toHaveBeenCalledTimes(3);
    expect(telemetry.trackAgentToolDiscoveryWrite.mock.calls[1][0]).toEqual(
      expect.objectContaining({ success: true, written: false })
    );
    expect(telemetry.trackAgentToolDiscoveryWrite.mock.calls[2][0]).toEqual(
      expect.objectContaining({ success: false, written: false, error_message: 'busy' })
    );
  });

  it('keeps telemetry best-effort', async () => {
    (discoveryWriteBulkHandler as jest.Mock).mockResolvedValue([
      {
        index: 0,
        discovery_id: 'discovery-1',
        event_id: 'event-1',
        kind: 'discovery',
        written: true,
      },
    ]);
    const telemetry = {
      trackAgentToolDiscoveryWrite: jest.fn().mockImplementation(() => {
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

  it('classifies unknown outcomes as non-retryable', async () => {
    (discoveryWriteBulkHandler as jest.Mock).mockRejectedValue(
      new BulkWriteError('outcome_unknown', 'transport failed')
    );
    const result = await invokeHandler(
      createTool({ trackAgentToolDiscoveryWrite: jest.fn() }) as never,
      { items: [input] },
      createMockToolContext()
    );

    expect(result).toEqual(
      expect.objectContaining({
        results: [
          expect.objectContaining({
            type: 'error',
            data: expect.objectContaining({ code: 'outcome_unknown', retryable: false }),
          }),
        ],
      })
    );
  });
});

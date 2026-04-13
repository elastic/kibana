/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createListStreamsTool } from './list_streams';
import { createMockGetScopedClients, createMockToolContext } from '../test_helpers';

describe('createListStreamsTool handler', () => {
  const setup = () => {
    const { getScopedClients, streamsClient } = createMockGetScopedClients();
    const tool = createListStreamsTool({ getScopedClients });
    const context = createMockToolContext();
    return { tool, context, streamsClient };
  };

  it('returns streams with correct types', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.listStreamsWithDataStreamExistence.mockResolvedValue([
      {
        exists: true,
        stream: {
          name: 'logs.wired',
          description: 'Wired stream',
          ingest: {
            wired: { fields: {}, routing: [] },
            processing: [],
            lifecycle: { inherit: {} },
            failure_store: { inherit: {} },
          },
        },
      },
      {
        exists: true,
        stream: {
          name: 'logs.classic',
          description: 'Classic stream',
          ingest: {
            classic: { field_overrides: {} },
            processing: [],
            lifecycle: { inherit: {} },
            failure_store: { inherit: {} },
          },
        },
      },
      {
        exists: true,
        stream: {
          name: 'query.test',
          description: 'Query stream',
          query: { esql: 'FROM logs' },
        },
      },
      {
        exists: false,
        stream: { name: 'logs.missing', description: '' },
      },
    ] as unknown as Awaited<ReturnType<typeof streamsClient.listStreamsWithDataStreamExistence>>);

    const result = await tool.handler({}, context);

    if ('results' in result) {
      const data = result.results[0].data as {
        streams: Array<{ name: string; type: string }>;
        count: number;
      };
      expect(data.count).toBe(3);
      expect(data.streams).toContainEqual(
        expect.objectContaining({ name: 'logs.wired', type: 'wired' })
      );
      expect(data.streams).toContainEqual(
        expect.objectContaining({ name: 'logs.classic', type: 'classic' })
      );
      expect(data.streams).toContainEqual(
        expect.objectContaining({ name: 'query.test', type: 'query' })
      );
      expect(data.streams).not.toContainEqual(expect.objectContaining({ name: 'logs.missing' }));
    }
  });

  it('returns empty list when no streams exist', async () => {
    const { tool, context, streamsClient } = setup();
    streamsClient.listStreamsWithDataStreamExistence.mockResolvedValue([]);

    const result = await tool.handler({}, context);

    if ('results' in result) {
      const data = result.results[0].data as {
        streams: Array<{ name: string }>;
        count: number;
      };
      expect(data.count).toBe(0);
      expect(data.streams).toEqual([]);
    }
  });

  it('returns error result on failure', async () => {
    const { tool, context, streamsClient } = setup();
    streamsClient.listStreamsWithDataStreamExistence.mockRejectedValue(
      new Error('security_exception: unauthorized')
    );

    const result = await tool.handler({}, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Failed to list streams');
      expect(data.likely_cause).toContain('Insufficient index privileges');
    }
  });
});

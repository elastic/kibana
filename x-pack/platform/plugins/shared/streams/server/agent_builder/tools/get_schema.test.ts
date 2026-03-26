/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { createGetSchemaTool } from './get_schema';
import { createMockGetScopedClients, createMockToolContext } from './test_helpers';

describe('createGetSchemaTool handler', () => {
  const emptySearchResponse = { hits: { hits: [] } } as unknown as SearchResponse;

  const setup = () => {
    const { getScopedClients, streamsClient, esClient } = createMockGetScopedClients();
    const tool = createGetSchemaTool({ getScopedClients });
    const context = createMockToolContext();
    return { tool, context, streamsClient, esClient };
  };

  it('returns mapped fields from definition and ancestors', async () => {
    const { tool, context, streamsClient, esClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'logs.child',
      ingest: {
        wired: {
          fields: { 'child.field': { type: 'keyword' } },
          routing: [],
        },
        processing: [],
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
      },
    } as unknown as Streams.all.Definition);

    streamsClient.getAncestors.mockResolvedValue([
      {
        name: 'logs',
        ingest: {
          wired: {
            fields: { '@timestamp': { type: 'date' }, message: { type: 'match_only_text' } },
            routing: [],
          },
        },
      },
    ] as unknown as Awaited<ReturnType<typeof streamsClient.getAncestors>>);

    esClient.search.mockResolvedValue(emptySearchResponse);

    const result = await tool.handler({ name: 'logs.child' }, context);

    if ('results' in result) {
      const data = result.results[0].data as {
        mapped_fields: Array<{ name: string; type: string; source: string }>;
        total_mapped: number;
      };
      expect(data.total_mapped).toBe(3);
      expect(data.mapped_fields).toContainEqual({
        name: 'child.field',
        type: 'keyword',
        source: 'logs.child',
      });
      expect(data.mapped_fields).toContainEqual({
        name: '@timestamp',
        type: 'date',
        source: 'logs',
      });
    }
  });

  it('detects unmapped fields from sample docs', async () => {
    const { tool, context, streamsClient, esClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'logs',
      ingest: {
        wired: {
          fields: { 'host.name': { type: 'keyword' } },
          routing: [],
        },
        processing: [],
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
      },
    } as unknown as Streams.all.Definition);

    streamsClient.getAncestors.mockResolvedValue([]);

    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _index: 'logs',
            _id: '1',
            _source: { 'host.name': 'h1', extra: { nested: 'val' } },
          },
        ],
      },
    } as unknown as SearchResponse);

    const result = await tool.handler({ name: 'logs' }, context);

    if ('results' in result) {
      const data = result.results[0].data as {
        unmapped_fields: string[];
        total_unmapped: number;
      };
      expect(data.unmapped_fields).toContain('extra.nested');
      expect(data.unmapped_fields).not.toContain('host.name');
      expect(data.total_unmapped).toBeGreaterThan(0);
    }
  });

  it('handles empty stream with no fields', async () => {
    const { tool, context, streamsClient, esClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'logs.empty',
      query: { esql: 'FROM empty' },
    } as unknown as Streams.all.Definition);

    streamsClient.getAncestors.mockResolvedValue([]);
    esClient.search.mockResolvedValue(emptySearchResponse);

    const result = await tool.handler({ name: 'logs.empty' }, context);

    if ('results' in result) {
      const data = result.results[0].data as {
        total_mapped: number;
        total_unmapped: number;
      };
      expect(data.total_mapped).toBe(0);
      expect(data.total_unmapped).toBe(0);
    }
  });

  it('returns error for not-found stream', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockRejectedValue(
      Object.assign(new Error('Cannot find stream'), { statusCode: 404 })
    );

    const result = await tool.handler({ name: 'no.exist' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('no.exist');
      expect(data.likely_cause).toContain('Stream not found');
    }
  });
});

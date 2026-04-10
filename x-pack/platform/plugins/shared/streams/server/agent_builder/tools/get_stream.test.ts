/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { createGetStreamTool } from './get_stream';
import { createMockGetScopedClients, createMockToolContext } from './test_helpers';

describe('createGetStreamTool handler', () => {
  const setup = () => {
    const { getScopedClients, streamsClient } = createMockGetScopedClients();
    const tool = createGetStreamTool({ getScopedClients });
    const context = createMockToolContext();
    return { tool, context, streamsClient };
  };

  it('returns wired definition shape', async () => {
    const { tool, context, streamsClient } = setup();

    const definition = {
      name: 'logs.wired',
      description: 'A wired stream',
      ingest: {
        wired: {
          fields: { message: { type: 'match_only_text' } },
          routing: [
            {
              destination: 'logs.child',
              where: { field: 'x', operator: 'eq', value: '1' },
              status: 'active',
            },
          ],
        },
        processing: [],
        lifecycle: { dsl: { data_retention: '7d' } },
        failure_store: { enabled: {} },
      },
    } as unknown as Streams.all.Definition;

    streamsClient.getStream.mockResolvedValue(definition);
    streamsClient.getAncestors.mockResolvedValue([]);
    streamsClient.getDescendants.mockResolvedValue([]);

    const result = await tool.handler({ name: 'logs.wired' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.type).toBe('wired');
      expect(data.name).toBe('logs.wired');
      expect(data.fields).toBeDefined();
      expect(data.routing).toBeDefined();
      expect(data.lifecycle).toBeDefined();
      expect(data.ancestors).toBeDefined();
    }
  });

  it('returns classic definition shape', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'logs.classic',
      description: 'A classic stream',
      ingest: {
        classic: { field_overrides: { msg: { type: 'text' } } },
        processing: [],
        lifecycle: { inherit: {} },
        failure_store: { disabled: {} },
      },
    } as unknown as Streams.all.Definition);

    const result = await tool.handler({ name: 'logs.classic' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.type).toBe('classic');
      expect(data.field_overrides).toBeDefined();
    }
  });

  it('returns query stream shape', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'query.test',
      description: 'A query stream',
      query: { esql: 'FROM logs | STATS count()' },
    } as unknown as Streams.all.Definition);

    const result = await tool.handler({ name: 'query.test' }, context);

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.type).toBe('query');
      expect(data.query).toBeDefined();
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

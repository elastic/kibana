/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { createMapFieldsTool } from './map_fields';
import { createMockGetScopedClients, createMockToolContext } from '../test_helpers';
import { StreamsWriteQueue } from '../write_queue';

describe('createMapFieldsTool', () => {
  const setup = () => {
    const { getScopedClients, streamsClient } = createMockGetScopedClients();
    const writeQueue = new StreamsWriteQueue();
    const tool = createMapFieldsTool({ getScopedClients, writeQueue });
    const context = createMockToolContext();
    return { tool, context, streamsClient };
  };

  it('has confirmation policy set to always', () => {
    const { tool } = setup();
    expect(tool.confirmation).toBeDefined();
    expect(tool.confirmation!.askUser).toBe('always');
  });

  it('uses change_description as confirmation message when provided', async () => {
    const { tool } = setup();
    const description = '**Fields**:\n- `response_time` — long\n- `user.name` — keyword';

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: {
        name: 'logs.nginx',
        fields_json: JSON.stringify({
          response_time: { type: 'long' },
          'user.name': { type: 'keyword' },
        }),
        change_description: description,
      },
    });

    expect(confirmation.title).toBe('Map 2 fields on "logs.nginx"');
    expect(confirmation.confirm_text).toBe('Map fields');
    expect(confirmation.message).toBe(description);
  });

  it('falls back to JSON params when change_description is omitted', async () => {
    const { tool } = setup();

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: {
        name: 'logs.nginx',
        fields_json: JSON.stringify({ response_time: { type: 'long' } }),
      },
    });

    expect(confirmation.title).toBe('Map 1 field on "logs.nginx"');
    expect(confirmation.message).toContain('"name": "logs.nginx"');
    expect(confirmation.message).toContain('```json');
  });

  it('shows danger confirmation for invalid JSON', async () => {
    const { tool } = setup();

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: { name: 'logs.nginx', fields_json: 'not-json' },
    });

    expect(confirmation.title).toBe('Invalid field mapping JSON');
    expect(confirmation.color).toBe('danger');
  });

  it('maps fields on a wired stream', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'logs.nginx',
      description: '',
      ingest: {
        wired: { fields: { message: { type: 'match_only_text' } }, routing: [] },
        processing: { steps: [], updated_at: '2024-01-01T00:00:00Z' },
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
      },
    } as unknown as Streams.all.Definition);

    const fields = { response_time: { type: 'long' }, 'user.name': { type: 'keyword' } };

    const result = await tool.handler(
      { name: 'logs.nginx', fields_json: JSON.stringify(fields) },
      context
    );

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.mapped_fields).toEqual(['response_time', 'user.name']);
    }
  });

  it('returns error for invalid JSON', async () => {
    const { tool, context } = setup();

    const result = await tool.handler({ name: 'logs.nginx', fields_json: 'not-json' }, context);

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Invalid fields JSON');
    }
  });

  it('returns error for query streams', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'query.test',
      description: '',
      query: { view: 'test-view', esql: 'FROM logs' },
    } as unknown as Streams.all.Definition);

    const result = await tool.handler(
      { name: 'query.test', fields_json: '{"field1":{"type":"keyword"}}' },
      context
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('not a wired or classic stream');
    }
  });
});

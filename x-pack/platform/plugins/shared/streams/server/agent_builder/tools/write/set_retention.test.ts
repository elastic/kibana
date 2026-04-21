/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { createSetRetentionTool } from './set_retention';
import { createMockGetScopedClients, createMockToolContext } from '../test_helpers';
import { StreamsWriteQueue } from '../write_queue';

describe('createSetRetentionTool', () => {
  const setup = () => {
    const { getScopedClients, streamsClient } = createMockGetScopedClients();
    const writeQueue = new StreamsWriteQueue();
    const tool = createSetRetentionTool({ getScopedClients, writeQueue });
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
    const description = '**Current**: Inherit from parent\n**Proposed**: DSL — 30d retention';

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: {
        name: 'logs.nginx',
        lifecycle_type: 'dsl',
        data_retention: '30d',
        ilm_policy: '',
        change_description: description,
      },
    });

    expect(confirmation.confirm_text).toBe('Update retention');
    expect(confirmation.title).toBe('Update retention on "logs.nginx"');
    expect(confirmation.message).toBe(description);
  });

  it('falls back to JSON params when change_description is omitted', async () => {
    const { tool } = setup();

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: {
        name: 'logs.nginx',
        lifecycle_type: 'dsl',
        data_retention: '30d',
        ilm_policy: '',
      },
    });

    expect(confirmation.message).toContain('"name": "logs.nginx"');
    expect(confirmation.message).toContain('"data_retention": "30d"');
    expect(confirmation.message).toContain('```json');
  });

  it('sets DSL retention on a wired stream', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'logs.nginx',
      description: 'Nginx logs',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: { steps: [], updated_at: '2024-01-01T00:00:00Z' },
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
      },
    } as unknown as Streams.all.Definition);

    const result = await tool.handler(
      {
        name: 'logs.nginx',
        lifecycle_type: 'dsl',
        data_retention: '30d',
        ilm_policy: '',
      },
      context
    );

    expect('results' in result).toBe(true);
    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.lifecycle).toEqual({ dsl: { data_retention: '30d' } });
    }
  });

  it('sets inherit lifecycle', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'logs.nginx',
      description: '',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: { steps: [], updated_at: '2024-01-01T00:00:00Z' },
        lifecycle: { dsl: { data_retention: '30d' } },
        failure_store: { inherit: {} },
      },
    } as unknown as Streams.all.Definition);

    const result = await tool.handler(
      {
        name: 'logs.nginx',
        lifecycle_type: 'inherit',
        data_retention: '',
        ilm_policy: '',
      },
      context
    );

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.lifecycle).toEqual({ inherit: {} });
    }
  });

  it('returns error for non-existent stream', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockRejectedValue(
      Object.assign(new Error('Cannot find stream'), { statusCode: 404 })
    );

    const result = await tool.handler(
      {
        name: 'no.exist',
        lifecycle_type: 'inherit',
        data_retention: '',
        ilm_policy: '',
      },
      context
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('no.exist');
    }
  });
});

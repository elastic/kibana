/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { createSetFailureStoreTool } from './set_failure_store';
import { createMockGetScopedClients, createMockToolContext } from '../test_helpers';
import { StreamsWriteQueue } from '../write_queue';

describe('createSetFailureStoreTool', () => {
  const setup = () => {
    const { getScopedClients, streamsClient } = createMockGetScopedClients();
    const writeQueue = new StreamsWriteQueue();
    const tool = createSetFailureStoreTool({ getScopedClients, writeQueue });
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
    const description = '**Current**: Inherit from parent\n**Proposed**: Enabled — 30d retention';

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: {
        name: 'logs.nginx',
        failure_store_type: 'enabled',
        data_retention: '30d',
        change_description: description,
      },
    });

    expect(confirmation.confirm_text).toBe('Update failure store');
    expect(confirmation.title).toBe('Update failure store on "logs.nginx"');
    expect(confirmation.message).toBe(description);
  });

  it('falls back to JSON params when change_description is omitted', async () => {
    const { tool } = setup();

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: {
        name: 'logs.nginx',
        failure_store_type: 'enabled',
        data_retention: '30d',
      },
    });

    expect(confirmation.message).toContain('"name": "logs.nginx"');
    expect(confirmation.message).toContain('"failure_store_type": "enabled"');
    expect(confirmation.message).toContain('```json');
  });

  it('enables failure store with retention', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'logs.nginx',
      description: '',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: { steps: [], updated_at: '2024-01-01T00:00:00Z' },
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
      },
    } as unknown as Streams.all.Definition);

    const result = await tool.handler(
      { name: 'logs.nginx', failure_store_type: 'enabled', data_retention: '30d' },
      context
    );

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.failure_store).toEqual({
        lifecycle: { enabled: { data_retention: '30d' } },
      });
    }
  });

  it('disables failure store', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'logs.nginx',
      description: '',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: { steps: [], updated_at: '2024-01-01T00:00:00Z' },
        lifecycle: { inherit: {} },
        failure_store: { lifecycle: { enabled: { data_retention: '30d' } } },
      },
    } as unknown as Streams.all.Definition);

    const result = await tool.handler(
      { name: 'logs.nginx', failure_store_type: 'disabled', data_retention: '' },
      context
    );

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.failure_store).toEqual({ disabled: {} });
    }
  });
});

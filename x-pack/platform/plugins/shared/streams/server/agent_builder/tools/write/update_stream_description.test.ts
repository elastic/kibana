/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { createUpdateStreamDescriptionTool } from './update_stream_description';
import { createMockGetScopedClients, createMockToolContext } from '../test_helpers';
import { StreamsWriteQueue } from '../write_queue';

describe('createUpdateStreamDescriptionTool', () => {
  const setup = () => {
    const { getScopedClients, streamsClient } = createMockGetScopedClients();
    const writeQueue = new StreamsWriteQueue();
    const tool = createUpdateStreamDescriptionTool({ getScopedClients, writeQueue });
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
    const description = '**Current**: Old description\n**New**: Nginx web server logs';

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: {
        name: 'logs.nginx',
        description: 'Nginx web server logs',
        change_description: description,
      },
    });

    expect(confirmation.confirm_text).toBe('Update description');
    expect(confirmation.title).toBe('Update description of "logs.nginx"');
    expect(confirmation.message).toBe(description);
  });

  it('falls back to JSON params when change_description is omitted', async () => {
    const { tool } = setup();

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: { name: 'logs.nginx', description: 'New description' },
    });

    expect(confirmation.message).toContain('"name": "logs.nginx"');
    expect(confirmation.message).toContain('"description": "New description"');
    expect(confirmation.message).toContain('```json');
  });

  it('updates description on a wired stream', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'logs.nginx',
      description: 'Old description',
      ingest: {
        wired: { fields: {}, routing: [] },
        processing: { steps: [], updated_at: '2024-01-01T00:00:00Z' },
        lifecycle: { inherit: {} },
        failure_store: { inherit: {} },
      },
    } as unknown as Streams.all.Definition);

    const result = await tool.handler(
      { name: 'logs.nginx', description: 'Nginx web server access logs' },
      context
    );

    expect(streamsClient.upsertStream).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'logs.nginx',
        request: expect.objectContaining({
          stream: expect.objectContaining({
            description: 'Nginx web server access logs',
          }),
        }),
      })
    );

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.description).toBe('Nginx web server access logs');
    }
  });

  it('returns error for non-existent stream', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockRejectedValue(
      Object.assign(new Error('Cannot find stream'), { statusCode: 404 })
    );

    const result = await tool.handler({ name: 'no.exist', description: 'test' }, context);

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
    }
  });
});

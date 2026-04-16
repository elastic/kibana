/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { createUpdateProcessorsTool } from './update_processors';
import { createMockGetScopedClients, createMockToolContext } from '../test_helpers';
import { StreamsWriteQueue } from '../write_queue';

describe('createUpdateProcessorsTool', () => {
  const setup = () => {
    const { getScopedClients, streamsClient } = createMockGetScopedClients();
    const writeQueue = new StreamsWriteQueue();
    const tool = createUpdateProcessorsTool({ getScopedClients, writeQueue });
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
    const description =
      '**Current**: 2 steps (grok, dissect)\n**New**: 3 steps (grok, dissect, date)';

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: {
        name: 'logs.nginx',
        processing_json: '{"steps":[]}',
        change_description: description,
      },
    });

    expect(confirmation.confirm_text).toBe('Update pipeline');
    expect(confirmation.title).toBe('Update processing pipeline on "logs.nginx"');
    expect(confirmation.message).toBe(description);
  });

  it('falls back to JSON params when change_description is omitted', async () => {
    const { tool } = setup();

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: {
        name: 'logs.nginx',
        processing_json: '{"steps":[]}',
      },
    });

    expect(confirmation.message).toContain('"name": "logs.nginx"');
    expect(confirmation.message).toContain('```json');
  });

  it('updates processing pipeline', async () => {
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

    const newProcessing = {
      steps: [{ action: 'grok', from: 'message', patterns: ['%{COMBINEDAPACHELOG}'] }],
    };

    const result = await tool.handler(
      { name: 'logs.nginx', processing_json: JSON.stringify(newProcessing) },
      context
    );

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.success).toBe(true);
    }
  });

  it('returns error for invalid JSON', async () => {
    const { tool, context } = setup();

    const result = await tool.handler({ name: 'logs.nginx', processing_json: 'not-json' }, context);

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Invalid processing JSON');
    }
  });

  it('returns error for non-ingest stream', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue({
      name: 'query.test',
      description: '',
      query: { view: 'test-view', esql: 'FROM logs' },
    } as unknown as Streams.all.Definition);

    const result = await tool.handler(
      { name: 'query.test', processing_json: '{"steps":[]}' },
      context
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
    }
  });
});

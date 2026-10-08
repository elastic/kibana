/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { createCreatePartitionTool } from './create_partition';
import { createMockGetScopedClients, createMockToolContext } from '../../utils/test_helpers';
import { StreamsWriteQueue } from '../../utils/write_queue';

const wiredStreamDef = (name: string): Streams.WiredStream.Definition => ({
  type: 'wired',
  name,
  description: '',
  updated_at: new Date().toISOString(),
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    wired: { fields: {}, routing: [] },
    failure_store: { inherit: {} },
  },
});

const classicStreamDef = (name: string): Streams.ClassicStream.Definition => ({
  type: 'classic',
  name,
  description: '',
  updated_at: new Date().toISOString(),
  ingest: {
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    classic: {},
    failure_store: { inherit: {} },
  },
});

describe('createCreatePartitionTool', () => {
  const setup = () => {
    const { getScopedClients, streamsClient } = createMockGetScopedClients();
    const writeQueue = new StreamsWriteQueue();
    const tool = createCreatePartitionTool({ getScopedClients, writeQueue });
    const context = createMockToolContext();
    return { tool, context, streamsClient };
  };

  it('has confirmation policy set to always', () => {
    const { tool } = setup();
    expect(tool.confirmation).toBeDefined();
    expect(tool.confirmation!.askUser).toBe('always');
  });

  it('uses confirmation_body as confirmation message when provided', async () => {
    const { tool, context } = setup();
    const description = '**Parent**: logs.otel\n**New child**: logs.otel.nginx';

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: {
        parent: 'logs.otel',
        child_name: 'logs.otel.nginx',
        condition_json: '{"field":"service.name","eq":"nginx"}',
        status: 'enabled',
        confirmation_body: description,
      },
      context,
    });

    expect(confirmation.title).toBe('Create child stream "logs.otel.nginx"');
    expect(confirmation.confirm_text).toBe('Create stream');
    expect(confirmation.message).toBe(description);
  });

  it('falls back to JSON params when confirmation_body is omitted', async () => {
    const { tool, context } = setup();

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: {
        parent: 'logs.otel',
        child_name: 'logs.otel.nginx',
        condition_json: '{"field":"service.name","eq":"nginx"}',
        status: 'enabled',
      },
      context,
    });

    expect(confirmation.message).toContain('**parent:** logs.otel');
    expect(confirmation.message).not.toContain('```json');
    expect(confirmation.message).not.toContain('confirmation_body');
  });

  it('forks a stream with an enabled condition', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs'));

    const condition = { field: 'service.name', eq: 'nginx' };

    const result = await tool.handler(
      {
        parent: 'logs',
        child_name: 'logs.nginx',
        condition_json: JSON.stringify(condition),
        status: 'enabled',
      },
      context
    );

    expect(streamsClient.forkStream).toHaveBeenCalledWith({
      parent: 'logs',
      where: condition,
      name: 'logs.nginx',
      status: 'enabled',
    });

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.parent).toBe('logs');
      expect(data.child).toBe('logs.nginx');
    }
  });

  it('returns clean error when parent is a classic stream', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue(classicStreamDef('logs-test'));

    const result = await tool.handler(
      {
        parent: 'logs-test',
        child_name: 'logs-test.nginx',
        condition_json: JSON.stringify({ field: 'service.name', eq: 'nginx' }),
        status: 'enabled',
      },
      context
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('only works on wired streams');
      expect(data.message).toContain('classic');
      expect(data.message).not.toMatch(/invalid_type|invalid_value|expected.*object/i);
    }
  });

  it('returns error when child name does not match parent prefix', async () => {
    const { tool, context } = setup();

    const result = await tool.handler(
      {
        parent: 'logs.otel',
        child_name: 'logs.nginx',
        condition_json: JSON.stringify({ field: 'service.name', eq: 'nginx' }),
        status: 'enabled',
      },
      context
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('must start with "logs.otel."');
    }
  });

  it('returns error for invalid condition JSON', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs'));

    const result = await tool.handler(
      {
        parent: 'logs',
        child_name: 'logs.nginx',
        condition_json: 'not-valid-json',
        status: 'enabled',
      },
      context
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Invalid condition JSON');
    }
  });

  it('returns error when fork fails', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.getStream.mockResolvedValue(wiredStreamDef('logs'));

    streamsClient.forkStream.mockRejectedValue(
      Object.assign(new Error('Child stream logs.nginx already exists'), { statusCode: 409 })
    );

    const result = await tool.handler(
      {
        parent: 'logs',
        child_name: 'logs.nginx',
        condition_json: JSON.stringify({ field: 'service.name', eq: 'nginx' }),
        status: 'enabled',
      },
      context
    );

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('logs.nginx');
    }
  });
});

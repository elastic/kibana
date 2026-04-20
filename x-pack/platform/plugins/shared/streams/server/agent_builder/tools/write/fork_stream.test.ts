/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createForkStreamTool } from './fork_stream';
import { createMockGetScopedClients, createMockToolContext } from '../test_helpers';
import { StreamsWriteQueue } from '../write_queue';

describe('createForkStreamTool', () => {
  const setup = () => {
    const { getScopedClients, streamsClient } = createMockGetScopedClients();
    const writeQueue = new StreamsWriteQueue();
    const tool = createForkStreamTool({ getScopedClients, writeQueue });
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
    const description = '**Parent**: logs.otel\n**New child**: logs.otel.nginx';

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: {
        parent: 'logs.otel',
        child_name: 'logs.otel.nginx',
        condition_json: '{"field":"service.name","eq":"nginx"}',
        status: 'enabled',
        change_description: description,
      },
    });

    expect(confirmation.title).toBe('Create child stream "logs.otel.nginx"');
    expect(confirmation.confirm_text).toBe('Create stream');
    expect(confirmation.message).toBe(description);
  });

  it('falls back to JSON params when change_description is omitted', async () => {
    const { tool } = setup();

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: {
        parent: 'logs.otel',
        child_name: 'logs.otel.nginx',
        condition_json: '{"field":"service.name","eq":"nginx"}',
        status: 'enabled',
      },
    });

    expect(confirmation.message).toContain('"parent": "logs.otel"');
    expect(confirmation.message).toContain('```json');
    expect(confirmation.message).not.toContain('change_description');
  });

  it('forks a stream with an enabled condition', async () => {
    const { tool, context, streamsClient } = setup();

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
    const { tool, context } = setup();

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

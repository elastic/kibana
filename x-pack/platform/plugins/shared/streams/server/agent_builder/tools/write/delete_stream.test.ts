/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDeleteStreamTool } from './delete_stream';
import { createMockGetScopedClients, createMockToolContext } from '../../utils/test_helpers';
import { StreamsWriteQueue } from '../../utils/write_queue';

describe('createDeleteStreamTool', () => {
  const setup = () => {
    const { getScopedClients, streamsClient } = createMockGetScopedClients();
    const writeQueue = new StreamsWriteQueue();
    const tool = createDeleteStreamTool({ getScopedClients, writeQueue });
    const context = createMockToolContext();
    return { tool, context, streamsClient };
  };

  it('has confirmation policy set to always', () => {
    const { tool } = setup();
    expect(tool.confirmation).toBeDefined();
    expect(tool.confirmation!.askUser).toBe('always');
  });

  it('uses confirmation_body as confirmation message when provided', async () => {
    const { tool } = setup();
    const description = '**Stream**: logs.nginx\n~1,200,000 docs will be deleted.';

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: { name: 'logs.nginx', confirmation_body: description },
    });

    expect(confirmation.title).toBe('Permanently delete stream "logs.nginx"');
    expect(confirmation.message).toBe(description);
    expect(confirmation.color).toBe('danger');
    expect(confirmation.confirm_text).toBe('Delete permanently');
  });

  it('falls back to JSON params when confirmation_body is omitted', async () => {
    const { tool } = setup();

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: { name: 'logs.nginx' },
    });

    expect(confirmation.message).toContain('**name:** logs.nginx');
    expect(confirmation.message).not.toContain('```json');
    expect(confirmation.message).not.toContain('confirmation_body');
    expect(confirmation.color).toBe('danger');
  });

  it('deletes a stream successfully', async () => {
    const { tool, context, streamsClient } = setup();

    const result = await tool.handler({ name: 'logs.nginx' }, context);

    expect(streamsClient.deleteStream).toHaveBeenCalledWith('logs.nginx');

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.success).toBe(true);
      expect(data.result).toBe('deleted');
    }
  });

  it('returns error when delete fails', async () => {
    const { tool, context, streamsClient } = setup();

    streamsClient.deleteStream.mockRejectedValue(
      Object.assign(new Error('Cannot delete root stream'), { statusCode: 400 })
    );

    const result = await tool.handler({ name: 'logs' }, context);

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('logs');
    }
  });
});

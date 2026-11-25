/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUpdateStreamTool } from './update_stream';
import { STREAMS_UPDATE_STREAM_TOOL_ID } from '../tool_ids';
import { createMockGetScopedClients, createMockToolContext } from '../../utils/test_helpers';
import { StreamsWriteQueue } from '../../utils/write_queue';

describe('update_stream tool', () => {
  it('has the expected tool id', () => {
    expect(STREAMS_UPDATE_STREAM_TOOL_ID).toBe('platform.streams.update_stream');
  });

  it('confirmation title is the generic update title', async () => {
    const { getScopedClients } = createMockGetScopedClients();
    const tool = createUpdateStreamTool({ getScopedClients, writeQueue: new StreamsWriteQueue() });
    const context = createMockToolContext();

    const confirmation = await tool.confirmation!.getConfirmation!({
      toolParams: {
        name: 'logs.ecs.nginx',
        changes: { description: 'updated' },
      },
      context,
    });

    expect(confirmation.title).toBe('Update stream "logs.ecs.nginx"');
  });
});

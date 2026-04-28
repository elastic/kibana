/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolOrigin } from '@kbn/agent-builder-common';
import { createToolCallEvent } from './graph_events';

describe('createToolCallEvent', () => {
  it('includes tool_origin in the emitted event payload', () => {
    const event = createToolCallEvent({
      toolCallId: 'call-1',
      toolId: 'inline.tool',
      params: { q: 1 },
      toolOrigin: ToolOrigin.inline,
    });

    // Tool origin is included for downstream link/no-link rendering decisions.
    expect(event.data).toEqual({
      tool_call_id: 'call-1',
      tool_id: 'inline.tool',
      params: { q: 1 },
      tool_call_group_id: undefined,
      tool_origin: ToolOrigin.inline,
    });
  });
});

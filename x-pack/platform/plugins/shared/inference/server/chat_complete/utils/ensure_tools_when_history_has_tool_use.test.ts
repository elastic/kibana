/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import { ensureToolsWhenHistoryHasToolUse } from './ensure_tools_when_history_has_tool_use';

describe('ensureToolsWhenHistoryHasToolUse', () => {
  const toolHistoryMessages: Message[] = [
    { role: MessageRole.User, content: 'question' },
    {
      role: MessageRole.Assistant,
      content: '',
      toolCalls: [
        {
          toolCallId: '1',
          function: { name: 'list_indices', arguments: {} },
        },
      ],
    },
    {
      role: MessageRole.Tool,
      name: 'list_indices',
      toolCallId: '1',
      response: { indices: [] },
    },
  ];

  it('returns existing tools unchanged', () => {
    const tools = {
      list_indices: { description: 'List indices' },
    };

    expect(
      ensureToolsWhenHistoryHasToolUse({
        tools,
        messages: toolHistoryMessages,
      })
    ).toBe(tools);
  });

  it('returns tools unchanged when history has no tool use', () => {
    expect(
      ensureToolsWhenHistoryHasToolUse({
        messages: [{ role: MessageRole.User, content: 'hello' }],
      })
    ).toBeUndefined();
  });

  it('injects a dummy tool when history has tool use and tools are empty', () => {
    expect(
      ensureToolsWhenHistoryHasToolUse({
        tools: {},
        messages: toolHistoryMessages,
      })
    ).toEqual({
      doNotCallThisTool: {
        description: 'Do not call this tool, it is strictly forbidden',
        schema: {
          type: 'object',
          properties: {},
        },
      },
    });
  });

  it('injects a dummy tool when history has tool use and tools are omitted', () => {
    expect(
      ensureToolsWhenHistoryHasToolUse({
        messages: toolHistoryMessages,
      })
    ).toEqual({
      doNotCallThisTool: {
        description: 'Do not call this tool, it is strictly forbidden',
        schema: {
          type: 'object',
          properties: {},
        },
      },
    });
  });
});

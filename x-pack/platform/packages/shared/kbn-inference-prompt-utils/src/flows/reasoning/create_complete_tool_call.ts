/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantMessage, ToolMessage } from '@kbn/inference-common';
import { MessageRole, generateFakeToolCallId } from '@kbn/inference-common';

const COMPLETE_INSTRUCTIONS = `Enter into your Definitive Output mode.`;

export function createCompleteToolCallResponse(toolCallId: string): ToolMessage {
  return {
    role: MessageRole.Tool,
    toolCallId,
    name: 'complete',
    response: {
      acknowledged: true,
      instructions: COMPLETE_INSTRUCTIONS,
    },
  };
}

export function createCompleteToolCall(): [AssistantMessage, ToolMessage] {
  const toolCallId = generateFakeToolCallId();
  return [
    {
      role: MessageRole.Assistant,
      content: '',
      toolCalls: [
        {
          function: {
            name: 'complete',
            arguments: {},
          },
          toolCallId,
        },
      ],
    },
    createCompleteToolCallResponse(toolCallId),
  ];
}

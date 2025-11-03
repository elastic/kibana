/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantMessage, ToolMessage } from '@kbn/inference-common';
import { MessageRole, generateFakeToolCallId } from '@kbn/inference-common';

const REASON_INSTRUCTIONS = `Reply in plain text, reflecting on previous steps and the task ahead. You're not allowed to call any tools in this turn - hand control back to the orchestrator. Start your reply with <<<BEGIN_INTERNAL>>>.`;

export function createReasonToolCall(): [AssistantMessage, ToolMessage] {
  const toolCallId = generateFakeToolCallId();
  return [
    {
      role: MessageRole.Assistant,
      content: '',
      toolCalls: [
        {
          function: {
            name: 'reason',
            arguments: {},
          },
          toolCallId,
        },
      ],
    },
    createReasonToolCallResponse(toolCallId),
  ];
}

export function createReasonToolCallResponse(toolCallId: string): ToolMessage {
  return {
    role: MessageRole.Tool,
    toolCallId,
    name: 'reason',
    response: {
      acknowledged: true,
      instructions: REASON_INSTRUCTIONS,
    },
  };
}

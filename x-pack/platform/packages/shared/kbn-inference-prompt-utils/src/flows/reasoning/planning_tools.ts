/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/inference-common';
import type { Message, ToolCallOfToolDefinitions } from '@kbn/inference-common';

export const PLANNING_TOOLS = {
  reason: {
    description: 'reason or reflect about the task ahead or the results',
    schema: {
      type: 'object',
      properties: {},
    },
  },
  complete: {
    description: 'complete the task based on the last output',
    schema: {
      type: 'object',
      properties: {},
    },
  },
} as const;

export type PlanningTools = typeof PLANNING_TOOLS;

export type PlanningToolCallName = keyof PlanningTools;

export type PlanningToolCall = ToolCallOfToolDefinitions<PlanningTools>;

export function isPlanningToolName(name: string) {
  return Object.keys(PLANNING_TOOLS).includes(name);
}

export function removeReasonToolCalls(messages: Message[]) {
  return messages.filter((message) => {
    const isInternalMessage =
      (message.role === MessageRole.Tool && message.name === 'reason') ||
      (message.role === MessageRole.Assistant &&
        message.toolCalls?.some((toolCall) => toolCall.function.name === 'reason'));

    return !isInternalMessage;
  });
}

export function removeSystemToolCalls(messages: Message[]) {
  return messages.filter((message) => {
    const isInternalMessage =
      (message.role === MessageRole.Tool && isPlanningToolName(message.name)) ||
      (message.role === MessageRole.Assistant &&
        message.toolCalls?.some((toolCall) => isPlanningToolName(toolCall.function.name)));

    return !isInternalMessage;
  });
}

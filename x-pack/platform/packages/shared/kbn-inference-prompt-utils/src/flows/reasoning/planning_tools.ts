/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message, ToolCallOfToolDefinitions, ToolMessageOf } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';

export const REASON_TOOL = {
  description: 'reason or reflect about the task ahead or the results',
  schema: {
    type: 'object',
    properties: {},
  },
} as const;

export const NEXT_TOOL = {
  description: 'perform the next step in the process',
  schema: {
    type: 'object',
    properties: {},
  },
} as const;

export const COMPLETE_TOOL = {
  description: 'complete the task based on the last output',
  schema: {
    type: 'object',
    properties: {},
  },
} as const;

export const PLANNING_TOOLS = {
  reason: REASON_TOOL,
  complete: COMPLETE_TOOL,
} as const;

export type PlanningTools = typeof PLANNING_TOOLS;

export type PlanningToolCallName = 'reason' | 'complete';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ReasonToolDefinition = {
  reason: typeof REASON_TOOL;
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CompleteToolDefinition = {
  complete: typeof COMPLETE_TOOL;
};

export type ReasonToolCall = ToolCallOfToolDefinitions<ReasonToolDefinition>;
export type CompleteToolCall = ToolCallOfToolDefinitions<CompleteToolDefinition>;

export type PlanningToolCall = ReasonToolCall | CompleteToolCall;

export type PlanningToolMessage = ToolMessageOf<
  {
    tools: ReasonToolDefinition & CompleteToolDefinition;
  },
  { complete: {}; reason: {} }
>;

export function isPlanningToolName(name: string): name is PlanningToolCallName {
  return name === 'reason' || name === 'complete';
}

export function removeSystemToolCalls(messages: Message[], to: number = messages.length) {
  return messages
    .slice(0, to)
    .filter((message) => {
      const isInternalMessage =
        (message.role === MessageRole.Tool && isPlanningToolName(message.name)) ||
        (message.role === MessageRole.Assistant &&
          message.toolCalls?.some((toolCall) => isPlanningToolName(toolCall.function.name)));

      return !isInternalMessage;
    })
    .concat(messages.slice(to));
}

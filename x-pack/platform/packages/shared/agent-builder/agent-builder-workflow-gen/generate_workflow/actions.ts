/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCall } from '@kbn/agent-builder-genai-utils/langchain';
import type { Action, AgentStepAction, ToolResultAction, ValidateAction } from './types';

/**
 * Factories — use these instead of constructing action object literals at the
 * call sites so the discriminator and required fields stay in one place.
 */

export const agentStepAction = ({
  toolCalls,
  text,
}: {
  toolCalls: ToolCall[];
  text?: string;
}): AgentStepAction => ({
  type: 'agent_step',
  toolCalls,
  text,
});

export const toolResultAction = ({
  toolCallId,
  name,
  success,
  data,
  error,
  currentYaml,
  validation,
}: {
  toolCallId: string;
  name: string;
  success: boolean;
  data?: unknown;
  error?: string;
  currentYaml?: string;
  validation?: { valid: boolean; errors: string[] };
}): ToolResultAction => ({
  type: 'tool_result',
  toolCallId,
  name,
  success,
  ...(data !== undefined ? { data } : {}),
  ...(error !== undefined ? { error } : {}),
  ...(currentYaml !== undefined ? { currentYaml } : {}),
  ...(validation !== undefined ? { validation } : {}),
});

export const validateAction = ({
  valid,
  errors,
}: {
  valid: boolean;
  errors: string[];
}): ValidateAction => ({
  type: 'validate',
  valid,
  errors,
});

/**
 * Type guards — mirror the pattern used in generate_esql/actions.ts.
 */

export const isAgentStepAction = (action: Action): action is AgentStepAction => {
  return action.type === 'agent_step';
};

export const isToolResultAction = (action: Action): action is ToolResultAction => {
  return action.type === 'tool_result';
};

export const isValidateAction = (action: Action): action is ValidateAction => {
  return action.type === 'validate';
};

/**
 * Find the most recent agent_step action in the action log.
 */
export const findLastAgentStep = (actions: Action[]): AgentStepAction | undefined => {
  for (let i = actions.length - 1; i >= 0; i--) {
    const a = actions[i];
    if (isAgentStepAction(a)) {
      return a;
    }
  }
  return undefined;
};

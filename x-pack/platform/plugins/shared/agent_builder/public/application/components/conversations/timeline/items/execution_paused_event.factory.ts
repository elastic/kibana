/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutionTerminatedEvent } from '@kbn/agent-builder-common';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import { createExecutionTerminatedEvent } from './execution_terminated_event.factory';

export const createConfirmationPrompt = (overrides?: Partial<PromptRequest>): PromptRequest => ({
  type: AgentPromptType.confirmation,
  id: 'prompt-1',
  title: 'Confirm action',
  message: 'The agent wants to delete 3 indices. Allow?',
  ...overrides,
});

/** A run that ended by asking the human something, instead of by answering. */
export const createExecutionPausedEvent = (
  overrides?: Partial<ExecutionTerminatedEvent>
): ExecutionTerminatedEvent => {
  const terminated = createExecutionTerminatedEvent(overrides);
  return {
    ...terminated,
    data: {
      ...terminated.data,
      outcome: { type: 'prompt_requested', prompts: [createConfirmationPrompt()] },
      ...overrides?.data,
    },
  };
};

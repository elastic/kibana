/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExecutionTerminatedEvent,
  ConversationRoundStep,
  AssistantResponse,
} from '@kbn/agent-builder-common';

export interface TerminatedResponse {
  steps: ConversationRoundStep[];
  response: AssistantResponse;
}

/**
 * Props for `AgentResponse` from a terminal event. Server-derived terminated events omit `steps`
 * because the steps ship as separate `execution_step` events, so the grouped steps are passed in.
 * Returns `undefined` for a `prompt_requested` outcome, which has no response to show.
 */
export const executionTerminatedToResponse = (
  event: ExecutionTerminatedEvent,
  groupedSteps: ConversationRoundStep[]
): TerminatedResponse | undefined => {
  const { outcome } = event.data;
  if (outcome.type !== 'responded') {
    return undefined;
  }
  const steps = event.data.steps ?? groupedSteps;
  return { steps, response: outcome.response };
};

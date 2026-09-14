/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ExecutionStepEvent,
  EventActorType,
  TimelineEventType,
  ConversationRoundStepType,
} from '@kbn/agent-builder-common';

export const createExecutionStepEvent = (
  overrides?: Partial<ExecutionStepEvent>
): ExecutionStepEvent => ({
  id: 'event-step-0',
  type: TimelineEventType.executionStep,
  created_at: '2026-09-03T11:17:15.000Z',
  actor: { type: EventActorType.agent, id: 'elastic-ai-agent' },
  execution_id: 'execution-1',
  trigger_event_id: 'event-1',
  data: {
    step: { type: ConversationRoundStepType.reasoning, reasoning: 'Thinking about the question.' },
    sequence: 0,
  },
  ...overrides,
});

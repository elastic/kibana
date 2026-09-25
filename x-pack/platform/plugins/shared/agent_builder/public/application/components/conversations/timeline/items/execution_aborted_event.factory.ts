/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ExecutionAbortedEvent,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';

export const createExecutionAbortedEvent = (
  overrides?: Partial<ExecutionAbortedEvent>
): ExecutionAbortedEvent => ({
  id: 'event-3',
  type: TimelineEventType.executionAborted,
  created_at: '2026-09-03T11:18:05.123Z',
  actor: { type: EventActorType.user, id: 'user-1', username: 'petr' },
  execution_id: 'execution-1',
  trigger_event_id: 'event-1',
  data: {
    aborted_by: { source: 'api', actor: { id: 'user-1', username: 'petr' } },
    time_to_last_token: 600,
  },
  ...overrides,
});

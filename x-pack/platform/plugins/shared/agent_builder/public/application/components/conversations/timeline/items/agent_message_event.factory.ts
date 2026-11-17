/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AgentMessageEvent,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';

export const createAgentMessageEvent = (
  overrides?: Partial<AgentMessageEvent>
): AgentMessageEvent => ({
  id: 'agent-message-1',
  type: TimelineEventType.agentMessage,
  created_at: '2025-01-01T00:00:00.000Z',
  actor: { type: EventActorType.agent, id: 'child-agent', username: 'child-agent' },
  data: { message: 'Background sub-agent execution child-1 finished.\n\nResult:\nAPPLE' },
  ...overrides,
});

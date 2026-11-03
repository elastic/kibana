/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExecutionTerminatedEvent,
  TimelineEvent,
  UserMessageEvent,
} from '@kbn/agent-builder-common';
import { EventActorType, TimelineEventType } from '@kbn/agent-builder-common';
import {
  buildTriggerDecisionInput,
  shouldRespondQuestions,
  SHOULD_RESPOND_QUESTION,
} from './build_trigger_decision_input';

const agent = { name: 'Observability Assistant', description: 'Investigates service health' };

let sequence = 0;

const userMessage = (fullName: string, message: string): UserMessageEvent => ({
  id: `event-${++sequence}`,
  created_at: new Date(sequence * 1000).toISOString(),
  actor: { type: EventActorType.user, id: fullName, full_name: fullName },
  type: TimelineEventType.userMessage,
  data: { message },
});

const agentReply = (message: string): ExecutionTerminatedEvent => ({
  id: `event-${++sequence}`,
  created_at: new Date(sequence * 1000).toISOString(),
  actor: { type: EventActorType.agent, id: 'agent-1' },
  type: TimelineEventType.executionTerminated,
  execution_id: `execution-${sequence}`,
  data: {
    outcome: { type: 'responded', response: { message } },
    model_usage: { connector_id: 'c', llm_calls: 1, input_tokens: 1, output_tokens: 1 },
    time_to_first_token: 0,
    time_to_last_token: 0,
  },
});

const historyLines = (input: string) => input.split('\n').filter((line) => line.startsWith('['));

describe('shouldRespondQuestions', () => {
  it('asks one predicate question named should_respond', () => {
    expect(Object.keys(shouldRespondQuestions)).toEqual([SHOULD_RESPOND_QUESTION]);
    expect(shouldRespondQuestions[SHOULD_RESPOND_QUESTION].type).toBe('predicate');
  });
});

describe('buildTriggerDecisionInput', () => {
  it('includes agent name and description, participants, history and the new message', () => {
    const events: TimelineEvent[] = [
      userMessage('Bruno Farache', 'Deploy 4.2 went out at 14:00'),
      agentReply("I'll flag anything unusual."),
    ];

    const input = buildTriggerDecisionInput({
      events,
      agent,
      message: { text: 'can you check latency?', hasAttachments: false, authorName: 'Jane Doe' },
    });

    expect(input).toContain('Agent: Observability Assistant - Investigates service health');
    expect(input).toContain('Participants: Bruno Farache, Observability Assistant, Jane Doe');
    expect(historyLines(input)).toEqual([
      '[Bruno Farache]: Deploy 4.2 went out at 14:00',
      "[Observability Assistant]: I'll flag anything unusual.",
    ]);
    expect(input).toContain('New message from Jane Doe:\ncan you check latency?');
  });

  it('keeps only the last 10 messages', () => {
    const events = Array.from({ length: 15 }, (_, index) => userMessage('Bruno', `m${index}`));

    const lines = historyLines(
      buildTriggerDecisionInput({
        events,
        agent,
        message: { text: 'hi', hasAttachments: false },
      })
    );

    expect(lines).toHaveLength(10);
    expect(lines[0]).toBe('[Bruno]: m5');
    expect(lines[9]).toBe('[Bruno]: m14');
  });

  it('truncates each message to 2000 characters', () => {
    const long = 'x'.repeat(5000);

    const input = buildTriggerDecisionInput({
      events: [userMessage('Bruno', long)],
      agent,
      message: { text: long, hasAttachments: false },
    });

    expect(historyLines(input)[0]).toBe(`[Bruno]: ${'x'.repeat(2000)}…`);
    expect(input.endsWith(`${'x'.repeat(2000)}…`)).toBe(true);
  });

  it('writes (attachments only) for a message without text', () => {
    const input = buildTriggerDecisionInput({
      events: [],
      agent,
      message: { text: '  ', hasAttachments: true, authorName: 'Jane Doe' },
    });

    expect(input).toContain('New message from Jane Doe:\n(attachments only)');
  });

  it('keeps @mentions verbatim', () => {
    const input = buildTriggerDecisionInput({
      events: [],
      agent,
      message: { text: '@agent ping @jane', hasAttachments: false },
    });

    expect(input).toContain('@agent ping @jane');
  });
});

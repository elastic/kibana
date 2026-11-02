/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentConfiguration, TimelineEvent } from '@kbn/agent-builder-common';
import { TimelineEventType } from '@kbn/agent-builder-common';
import type { ProcessedTimelineEvent } from '@kbn/agent-builder-server';
import { createAgentHandlerContextMock } from '../../../../test_utils/runner';
import {
  BOOM,
  T0,
  T1,
  completedRoundTimeline,
  eventsNativeConversation,
  failedExec0Timeline,
  pausedRoundTimeline,
} from '../../../../test_utils/timeline';
import { eventsForContext } from '../utils/context_timeline';
import type { ProcessedConversation } from '../utils/prepare_conversation';
import { buildCycleHookExecutionContext } from './execution_context';

/** The context timeline a stored timeline is prepared into, with its user messages processed. */
const processed = (events: TimelineEvent[]): ProcessedTimelineEvent[] =>
  eventsForContext(eventsNativeConversation(events)).map((event) =>
    event.type === TimelineEventType.userMessage
      ? { ...event, data: { ...event.data, attachments: [] } }
      : event
  ) as ProcessedTimelineEvent[];

const build = (timeline: ProcessedTimelineEvent[], resumedRoundId?: string) => {
  const processedConversation = {
    timeline,
    nextInput: { message: 'next', attachments: [] },
    resumedRoundId,
  } as unknown as ProcessedConversation;
  const agentConfiguration = { tools: [] } as unknown as AgentConfiguration;
  const execution = buildCycleHookExecutionContext({
    context: createAgentHandlerContextMock(),
    agentId: 'agent-1',
    agentConfiguration,
    skills: [],
    roundId: 'round-x',
    executionId: 'exec-x',
    resumed: false,
    conversationId: 'conv-1',
    processedConversation,
  });
  return { execution, processedConversation, agentConfiguration };
};

describe('buildCycleHookExecutionContext', () => {
  it('exposes the timeline before this run, and one summary per ended execution', () => {
    const timeline = processed([
      ...completedRoundTimeline('r1', T0),
      ...failedExec0Timeline('r2', [], T1),
    ]);

    const { execution } = build(timeline);

    expect(execution.conversation.events).toEqual(timeline);
    expect(execution.conversation.executions).toEqual([
      expect.objectContaining({
        input: expect.objectContaining({ message: 'hello r1' }),
        steps: [],
        outcome: 'responded',
        response: { message: 'answer r1' },
      }),
      expect.objectContaining({
        input: expect.objectContaining({ message: 'hello r2' }),
        outcome: 'failed',
        error: BOOM,
      }),
    ]);
    for (const summary of execution.conversation.executions) {
      expect(summary.events[0].type).toBe(TimelineEventType.userMessage);
      expect(summary.events.slice(1).every((event) => event.execution_id === summary.id)).toBe(
        true
      );
    }
  });

  it('leaves out the paused round this run resumes: it is the current run, not history', () => {
    const history = processed(completedRoundTimeline('r1', T0));
    const paused = processed(pausedRoundTimeline('p', ['c1'], T1));

    const { execution } = build([...history, ...paused], 'p');

    expect(execution.conversation.events).toEqual(history);
    expect(execution.conversation.executions.map((summary) => summary.outcome)).toEqual([
      'responded',
    ]);
  });

  it('keeps a paused round the run does not resume in the history', () => {
    const timeline = processed([
      ...completedRoundTimeline('r1', T0),
      ...pausedRoundTimeline('p', ['c1'], T1),
    ]);

    const { execution } = build(timeline);

    expect(execution.conversation.events).toEqual(timeline);
  });

  it('hands out copies, made once: what a hook does to them never reaches the run', () => {
    const timeline = processed(completedRoundTimeline('r1', T0));
    const { execution, processedConversation, agentConfiguration } = build(timeline);

    const events = execution.conversation.events as ProcessedTimelineEvent[];
    expect(events).toBe(execution.conversation.events);
    events.pop();
    (execution.conversation.executions[0].response as { message: string }).message = 'tampered';
    (execution.input as { message: string }).message = 'tampered';
    (execution.agent.configuration as { tools: unknown[] }).tools.push('tampered');

    expect(processedConversation.timeline).toEqual(timeline);
    expect(processedConversation.nextInput.message).toBe('next');
    expect(agentConfiguration.tools).toEqual([]);
  });
});

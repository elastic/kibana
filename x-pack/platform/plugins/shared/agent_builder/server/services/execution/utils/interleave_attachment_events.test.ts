/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep, TimelineEvent, ToolCallStep } from '@kbn/agent-builder-common';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import {
  attachmentEventFixture,
  interruptedExecutionEvents,
  promptResponseEvent,
  terminatedExecutionEvents,
  userMessageEvent,
} from '../../../test_utils/timeline';
import { interleaveAttachmentEvents } from './interleave_attachment_events';

const call = (id: string, groupId?: string): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_id: 'my.tool',
  ...(groupId ? { tool_call_group_id: groupId } : {}),
  params: {},
  results: [],
  progression: [],
});

const reasoning = (text: string): ConversationRoundStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning: text,
});

const responded = { type: 'responded' as const, response: { message: 'done' } };

const freshBatch = (steps: ConversationRoundStep[]): TimelineEvent[] => [
  userMessageEvent('r1'),
  ...terminatedExecutionEvents({ roundId: 'r1', steps, outcome: responded }),
];

const ids = (events: TimelineEvent[]): string[] => events.map(({ id }) => id);

describe('interleaveAttachmentEvents', () => {
  it('returns the batch unchanged without attachment events', () => {
    const batch = freshBatch([call('a')]);
    expect(interleaveAttachmentEvents(batch, [])).toEqual(batch);
  });

  it('places the input events right after their trigger, before the execution starts', () => {
    const input = attachmentEventFixture({
      id: 'input',
      source: 'chat_input',
      triggerEventId: 'r1::user_message',
      executionId: 'r1::execution',
    });

    expect(ids(interleaveAttachmentEvents(freshBatch([call('a')]), [input]))).toEqual([
      'r1::user_message',
      'input',
      'r1::execution_started',
      'r1::step::0',
      'r1::execution_terminated',
    ]);
  });

  it('places the events of a tool call right after its step', () => {
    const made = attachmentEventFixture({
      id: 'made-by-a',
      toolCallId: 'a',
      executionId: 'r1::execution',
    });

    expect(
      ids(interleaveAttachmentEvents(freshBatch([call('a'), reasoning('next'), call('b')]), [made]))
    ).toEqual([
      'r1::user_message',
      'r1::execution_started',
      'r1::step::0',
      'made-by-a',
      'r1::step::1',
      'r1::step::2',
      'r1::execution_terminated',
    ]);
  });

  it('places the events of a parallel call after the last step of its group, in drain order', () => {
    const fromB = attachmentEventFixture({ id: 'from-b', toolCallId: 'b', version: 2 });
    const fromA = attachmentEventFixture({ id: 'from-a', toolCallId: 'a', version: 3 });

    expect(
      ids(
        interleaveAttachmentEvents(freshBatch([call('a', 'g1'), call('b', 'g1'), call('c')]), [
          fromB,
          fromA,
        ])
      )
    ).toEqual([
      'r1::user_message',
      'r1::execution_started',
      'r1::step::0',
      'r1::step::1',
      'from-b',
      'from-a',
      'r1::step::2',
      'r1::execution_terminated',
    ]);
  });

  it('places events without a matching step right before the terminal event', () => {
    const hook = attachmentEventFixture({ id: 'hook' });
    const nested = attachmentEventFixture({ id: 'nested', toolCallId: 'nested-call' });

    expect(ids(interleaveAttachmentEvents(freshBatch([call('a')]), [hook, nested]))).toEqual([
      'r1::user_message',
      'r1::execution_started',
      'r1::step::0',
      'hook',
      'nested',
      'r1::execution_terminated',
    ]);
  });

  it('places the input events of a resume after its prompt response', () => {
    const batch = [
      promptResponseEvent('r1', 1, 'r1::execution_terminated'),
      ...terminatedExecutionEvents({
        roundId: 'r1',
        index: 1,
        steps: [call('paused')],
        outcome: responded,
      }),
    ];
    const input = attachmentEventFixture({
      id: 'resume-input',
      source: 'chat_input',
      triggerEventId: 'r1::prompt_response::1',
    });
    const resolved = attachmentEventFixture({ id: 'from-resolved', toolCallId: 'paused' });

    expect(ids(interleaveAttachmentEvents(batch, [resolved, input]))).toEqual([
      'r1::prompt_response::1',
      'resume-input',
      'r1::execution::1::execution_started',
      'r1::execution::1::step::0',
      'from-resolved',
      'r1::execution::1::execution_terminated',
    ]);
  });

  it('places leftover events before the terminal event of an interrupted execution', () => {
    const batch = [
      userMessageEvent('r1'),
      ...interruptedExecutionEvents({
        roundId: 'r1',
        steps: [call('a')],
        interruption: { type: 'aborted' },
      }),
    ];
    const leftover = attachmentEventFixture({ id: 'leftover', toolCallId: 'thrown' });

    expect(ids(interleaveAttachmentEvents(batch, [leftover]))).toEqual([
      'r1::user_message',
      'r1::execution_started',
      'r1::step::0',
      'leftover',
      'r1::execution_aborted',
    ]);
  });
});

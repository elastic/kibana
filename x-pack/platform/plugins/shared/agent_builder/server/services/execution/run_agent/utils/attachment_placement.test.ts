/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep, ExecutionTerminatedEvent } from '@kbn/agent-builder-common';
import { ConversationRoundStepType, TimelineEventType } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import {
  attachmentEventFixture,
  pauseState,
  promptResponseEvent,
  T0,
} from '../../../../test_utils/timeline';
import type { RoundAttachmentPlacement } from './attachment_placement';
import {
  buildResumeAnchors,
  pausedItems,
  placeRoundAttachmentEvents,
} from './attachment_placement';

const call = (id: string): ConversationRoundStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_id: 't',
  params: {},
  results: [],
  progression: [],
});
const question = (promptId: string): ConversationRoundStep =>
  ({
    type: ConversationRoundStepType.askUserQuestion,
    prompt_id: promptId,
    questions: [],
  } as unknown as ConversationRoundStep);

const terminated = (nodes: string[], askPromptIds: string[] = []): ExecutionTerminatedEvent =>
  ({
    id: 'r1::execution_terminated',
    type: TimelineEventType.executionTerminated,
    created_at: T0,
    actor: { type: 'agent', id: 'a' },
    execution_id: 'r1::execution',
    data: {
      model_usage: { connector_id: 'c', llm_calls: 0, input_tokens: 0, output_tokens: 0 },
      time_to_first_token: 0,
      time_to_last_token: 0,
      state: pauseState(nodes),
      outcome: {
        type: 'prompt_requested',
        prompts: askPromptIds.map((id) => ({
          id,
          type: AgentPromptType.ask_user_question,
          questions: [],
        })),
      },
    },
  } as unknown as ExecutionTerminatedEvent);

const placedIds = (placement: RoundAttachmentPlacement): string[] =>
  [
    ...[...placement.afterToolCall.values()].flat(),
    ...[...placement.afterQuestion.values()].flat(),
    ...placement.afterOutcome,
  ].map((event) => event.id);

describe('pausedItems', () => {
  it('lists the paused tool calls, then the asked questions', () => {
    expect(pausedItems(terminated(['c1'], ['q1']))).toEqual([
      { type: 'tool_call', tool_call_id: 'c1' },
      { type: 'question', prompt_id: 'q1' },
    ]);
  });
});

describe('buildResumeAnchors', () => {
  it('maps each prompt_response to the items of the pause it answers', () => {
    const anchors = buildResumeAnchors([
      terminated(['c1']),
      promptResponseEvent('r1', 1, 'r1::execution_terminated'),
    ]);
    expect(anchors.get('r1::prompt_response::1')).toEqual([
      { type: 'tool_call', tool_call_id: 'c1' },
    ]);
  });
});

describe('placeRoundAttachmentEvents', () => {
  const anchors = new Map([['r1::prompt_response::1', pausedItems(terminated(['c1'], ['q1']))]]);

  it('places tool changes after their call, resume input after the last paused item, the rest after the outcome', () => {
    const toolEvent = attachmentEventFixture({ id: 't', toolCallId: 'c2' });
    const resumeInput = attachmentEventFixture({
      id: 'in',
      source: 'chat_input',
      triggerEventId: 'r1::prompt_response::1',
    });
    const hookEvent = attachmentEventFixture({ id: 'h' });
    const nested = attachmentEventFixture({ id: 'n', toolCallId: 'generated-id' });

    const placement = placeRoundAttachmentEvents({
      steps: [call('c1'), question('q1'), call('c2')],
      events: [toolEvent, resumeInput, hookEvent, nested],
      resumeAnchors: anchors,
    });

    expect(placement.afterToolCall.get('c2')?.map((e) => e.id)).toEqual(['t']);
    expect(placement.afterQuestion.get('q1')?.map((e) => e.id)).toEqual(['in']);
    expect(placement.afterOutcome.map((e) => e.id)).toEqual(['h', 'n']);
  });

  it('skips the input events rendered inside the user message, and legacy events', () => {
    const placement = placeRoundAttachmentEvents({
      steps: [call('c1')],
      events: [
        attachmentEventFixture({
          id: 'msg-input',
          source: 'chat_input',
          triggerEventId: 'r1::user_message',
        }),
        attachmentEventFixture({ id: 'old', toolCallId: 'c1', legacy: true }),
      ],
      resumeAnchors: new Map(),
      userMessageId: 'r1::user_message',
    });
    expect([...placement.afterToolCall.values()].flat()).toEqual([]);
    expect(placement.afterOutcome).toEqual([]);
  });

  it("places each of a round's events once, and its message's input nowhere", () => {
    const placement = placeRoundAttachmentEvents({
      steps: [call('c1'), question('q1'), call('c2')],
      events: [
        attachmentEventFixture({
          id: 'msg-input',
          source: 'chat_input',
          triggerEventId: 'r1::user_message',
        }),
        attachmentEventFixture({ id: 't', toolCallId: 'c1' }),
        attachmentEventFixture({
          id: 'in',
          source: 'chat_input',
          triggerEventId: 'r1::prompt_response::1',
        }),
        attachmentEventFixture({ id: 'h' }),
      ],
      resumeAnchors: anchors,
      userMessageId: 'r1::user_message',
    });
    expect(placedIds(placement).sort()).toEqual(['h', 'in', 't']);
  });

  it('places a resume input after the outcome when none of its paused items is in the steps', () => {
    const placement = placeRoundAttachmentEvents({
      steps: [call('other')],
      events: [
        attachmentEventFixture({
          id: 'in',
          source: 'chat_input',
          triggerEventId: 'r1::prompt_response::1',
        }),
      ],
      resumeAnchors: anchors,
    });
    expect(placement.afterOutcome.map((e) => e.id)).toEqual(['in']);
  });
});

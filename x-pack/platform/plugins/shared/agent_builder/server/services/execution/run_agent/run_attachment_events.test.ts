/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventActorType, TimelineEventType } from '@kbn/agent-builder-common';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import {
  T1,
  attachmentEventFixture,
  eventsNativeConversation,
  pauseState,
  pausedRoundTimeline,
  promptResponseEvent,
  terminatedExecutionEvents,
} from '../../../test_utils/timeline';
import {
  RunAttachmentEvents,
  inheritedAttachmentEvents,
  runTriggerEventId,
} from './run_attachment_events';
import { getPendingTurn } from './utils/conversation_turn';
import { pausedItems } from './utils/attachment_placement';

const getTypeDefinition = (type: string) =>
  ({
    id: type,
    validate: (input: unknown) => ({ valid: true, data: input }),
    isReadonly: false,
  } as unknown as AttachmentTypeDefinition);

const setup = () => {
  const attachmentStateManager = createAttachmentStateManager([], { getTypeDefinition });
  const runEvents = new RunAttachmentEvents({
    attachmentStateManager,
    roundId: 'r1',
    triggerEventId: 'r1::user_message',
    inputActor: { type: EventActorType.user, id: 'u1' },
    agentId: 'agent-1',
  });
  return { attachmentStateManager, runEvents };
};

describe('RunAttachmentEvents', () => {
  it('materializes the incoming message changes as chat_input events linked to the trigger', async () => {
    const { attachmentStateManager, runEvents } = setup();
    await attachmentStateManager.add({ id: 'a1', type: 'text', data: 'x' });

    const [event] = runEvents.drainChatInput();

    expect(event).toMatchObject({
      type: TimelineEventType.attachmentAdded,
      execution_id: 'r1::execution',
      trigger_event_id: 'r1::user_message',
      actor: { type: EventActorType.user, id: 'u1' },
      data: { attachment_id: 'a1', source: 'chat_input', format: 2 },
    });
  });

  it('drains only the given tool calls, as agent execution events', async () => {
    const { attachmentStateManager, runEvents } = setup();
    await attachmentStateManager.forToolCall('c1').add({ id: 'a1', type: 'text', data: 'x' });
    await attachmentStateManager.forToolCall('c2').add({ id: 'a2', type: 'text', data: 'y' });

    const drained = runEvents.drainToolCalls(['c1']);

    expect(drained.map((event) => event.data.attachment_id)).toEqual(['a1']);
    expect(drained[0]).toMatchObject({
      actor: { type: EventActorType.agent, id: 'agent-1' },
      data: { source: 'execution', tool_call_id: 'c1' },
    });
    expect(runEvents.drainRemaining().map((event) => event.data.attachment_id)).toEqual(['a2']);
  });

  it('lists every materialized event in drain order', async () => {
    const { attachmentStateManager, runEvents } = setup();
    await attachmentStateManager.add({ id: 'a1', type: 'text', data: 'x' });
    runEvents.drainChatInput();
    await attachmentStateManager.forToolCall('c1').add({ id: 'a2', type: 'text', data: 'y' });
    runEvents.drainToolCalls(['c1']);
    await attachmentStateManager.add({ id: 'a3', type: 'text', data: 'z' });
    runEvents.drainRemaining();

    expect(runEvents.list().map((event) => [event.data.attachment_id, event.data.source])).toEqual([
      ['a1', 'chat_input'],
      ['a2', 'execution'],
      ['a3', 'execution'],
    ]);
  });
});

describe('inheritedAttachmentEvents', () => {
  it('keeps tool changes and earlier resume inputs, not the inputs sent with the user message', () => {
    const timeline = [
      ...pausedRoundTimeline('r1', ['c1']),
      attachmentEventFixture({
        id: 'msg-input',
        source: 'chat_input',
        executionId: 'r1::execution',
        triggerEventId: 'r1::user_message',
      }),
      attachmentEventFixture({ id: 'tool', executionId: 'r1::execution', toolCallId: 'c1' }),
      attachmentEventFixture({
        id: 'resume-input',
        source: 'chat_input',
        executionId: 'r1::execution',
        triggerEventId: 'r1::prompt_response::1',
      }),
    ];
    expect(inheritedAttachmentEvents(timeline, 'r1').map((event) => event.id)).toEqual([
      'tool',
      'resume-input',
    ]);
  });
});

describe('runTriggerEventId', () => {
  it('is the round user message for a fresh run', () => {
    expect(runTriggerEventId({ conversation: undefined, roundId: 'r1' })).toBe('r1::user_message');
  });

  it('is the id the next prompt_response gets for a resume', () => {
    expect(
      runTriggerEventId({ conversation: { events: [] }, pendingTurnId: 'r0', roundId: 'r1' })
    ).toBe('r0::prompt_response::1');
  });

  describe('pause, resume, pause again', () => {
    const timeline = [
      ...pausedRoundTimeline('r0', ['c1']),
      promptResponseEvent('r0', 1, 'r0::execution_terminated'),
      ...terminatedExecutionEvents({
        roundId: 'r0',
        index: 1,
        createdAt: T1,
        outcome: {
          type: 'prompt_requested',
          prompts: [
            { id: 'tools.my_tool.confirmation.c2', type: AgentPromptType.confirmation } as never,
          ],
        },
        state: pauseState(['c2']),
      }),
    ];

    it('gives the second resume the next prompt_response id', () => {
      expect(
        runTriggerEventId({ conversation: { events: timeline }, pendingTurnId: 'r0', roundId: 'x' })
      ).toBe('r0::prompt_response::2');
    });

    it('anchors the second resume on the second pause', () => {
      const pendingTurn = getPendingTurn(eventsNativeConversation(timeline));
      expect(pendingTurn?.terminated?.id).toBe('r0::execution::1::execution_terminated');
      expect(pendingTurn?.terminated && pausedItems(pendingTurn.terminated)).toEqual([
        { type: 'tool_call', tool_call_id: 'c2' },
      ]);
    });
  });
});

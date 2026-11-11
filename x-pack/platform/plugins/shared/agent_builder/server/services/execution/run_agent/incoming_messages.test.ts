/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  ConversationRoundStepType,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import type { Conversation, ConversationEvent } from '@kbn/agent-builder-common';
import { createConversationClientMock } from '../../../test_utils/conversations';
import { createIncomingMessages } from './incoming_messages';
import { STEERS_PER_CHECK_MAX } from './constants';

const owner = { type: EventActorType.user, id: 'owner' };
const other = { type: EventActorType.user, id: 'other' };

const steer = (
  id: string,
  actor = owner,
  createdAt = '2026-01-01T00:00:01.000Z'
): ConversationEvent => ({
  id,
  type: TimelineEventType.userMessage,
  created_at: createdAt,
  actor,
  data: { message: `m-${id}`, steer: { execution_id: 'exec-1' } },
});

const failedRead = (executionId: string, eventId: string): ConversationEvent[] => [
  {
    id: `${executionId}::step::0`,
    type: TimelineEventType.executionStep,
    execution_id: executionId,
    created_at: '2026-01-01T00:00:02.000Z',
    actor: owner,
    data: {
      sequence: 0,
      step: {
        type: ConversationRoundStepType.deliveredMessage,
        event_id: eventId,
        author: owner,
        is_run_owner: true,
        message: `m-${eventId}`,
        delivered_at: '2026-01-01T00:00:02.000Z',
        cycle: 1,
        redelivered: 0,
      },
    },
  },
  {
    id: `${executionId}::failed`,
    type: TimelineEventType.executionFailed,
    execution_id: executionId,
    created_at: '2026-01-01T00:00:03.000Z',
    actor: owner,
    data: { error: { code: 'x', message: 'x' } },
  },
];

const document = (
  events: ConversationEvent[],
  activeExecutionId: string | undefined = 'exec-1'
): Conversation =>
  ({
    id: 'conv-1',
    events,
    ...(activeExecutionId ? { active_execution: { execution_id: activeExecutionId } } : {}),
  } as unknown as Conversation);

describe('createIncomingMessages', () => {
  const setup = () => {
    const client = createConversationClientMock();
    const incoming = createIncomingMessages({
      conversationClient: client,
      conversationId: 'conv-1',
      executionId: 'exec-1',
      runOwnerId: 'owner',
      logger: loggerMock.create(),
    });
    return { client, incoming };
  };

  it('reads the body on the first check and delivers pending steers with the owner flag', async () => {
    const { client, incoming } = setup();
    client.getWithVersion.mockResolvedValue({
      conversation: document([steer('s1'), steer('s2', other, '2026-01-01T00:00:00.000Z')]),
      seqNo: 10,
      primaryTerm: 1,
    });

    const delivered = await incoming.drain({ cycle: 0 });

    expect(client.peekVersion).not.toHaveBeenCalled();
    expect(delivered.map((step) => [step.event_id, step.is_run_owner])).toEqual([
      ['s2', false],
      ['s1', true],
    ]);
    expect(delivered[0]).toMatchObject({ cycle: 0, redelivered: 0, message: 'm-s2' });
  });

  it('skips the body read when the version did not change', async () => {
    const { client, incoming } = setup();
    client.getWithVersion.mockResolvedValue({
      conversation: document([]),
      seqNo: 10,
      primaryTerm: 1,
    });
    await incoming.drain({ cycle: 0 });
    client.peekVersion.mockResolvedValue({ seqNo: 10, primaryTerm: 1 });

    const delivered = await incoming.drain({ cycle: 1 });

    expect(delivered).toEqual([]);
    expect(client.getWithVersion).toHaveBeenCalledTimes(1);
  });

  it('reads again on change and delivers each steer at most once per execution', async () => {
    const { client, incoming } = setup();
    client.getWithVersion.mockResolvedValue({
      conversation: document([steer('s1')]),
      seqNo: 10,
      primaryTerm: 1,
    });
    await incoming.drain({ cycle: 0 });
    client.peekVersion.mockResolvedValue({ seqNo: 11, primaryTerm: 1 });
    client.getWithVersion.mockResolvedValue({
      conversation: document([steer('s1'), steer('s2')]),
      seqNo: 11,
      primaryTerm: 1,
    });

    const delivered = await incoming.drain({ cycle: 1, lastToolCallGroupId: 'g1' });

    expect(delivered.map((step) => step.event_id)).toEqual(['s2']);
    expect(delivered[0].tool_call_group_id).toBe('g1');
  });

  it('stops delivering once another execution holds the conversation', async () => {
    const { client, incoming } = setup();
    client.getWithVersion.mockResolvedValue({
      conversation: document([steer('s1')], 'exec-2'),
      seqNo: 10,
      primaryTerm: 1,
    });

    expect(await incoming.drain({ cycle: 0 })).toEqual([]);

    client.peekVersion.mockResolvedValue({ seqNo: 12, primaryTerm: 1 });
    expect(await incoming.drain({ cycle: 1 })).toEqual([]);
    expect(client.getWithVersion).toHaveBeenCalledTimes(1);
  });

  it('caps a single check and counts earlier unfinished reads as redeliveries', async () => {
    const { client, incoming } = setup();
    const many = Array.from({ length: STEERS_PER_CHECK_MAX + 2 }, (_, index) =>
      steer(`s${index}`, owner, `2026-01-01T00:00:0${index}.000Z`)
    );
    client.getWithVersion.mockResolvedValue({
      conversation: document([...many, ...failedRead('exec-0', 's0')]),
      seqNo: 10,
      primaryTerm: 1,
    });

    const delivered = await incoming.drain({ cycle: 0 });

    expect(delivered).toHaveLength(STEERS_PER_CHECK_MAX);
    expect(delivered[0]).toMatchObject({ event_id: 's0', redelivered: 1 });
  });

  it('returns nothing and keeps going when the probe or the read fails', async () => {
    const { client, incoming } = setup();
    client.getWithVersion.mockRejectedValueOnce(new Error('boom'));

    expect(await incoming.drain({ cycle: 0 })).toEqual([]);

    client.getWithVersion.mockResolvedValue({
      conversation: document([steer('s1')]),
      seqNo: 10,
      primaryTerm: 1,
    });
    expect((await incoming.drain({ cycle: 1 })).map((step) => step.event_id)).toEqual(['s1']);
  });
});

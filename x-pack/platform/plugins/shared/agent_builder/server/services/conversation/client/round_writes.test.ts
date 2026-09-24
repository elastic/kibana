/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationEvent,
  ConversationRound,
  ConversationRoundStep,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import {
  AgentBuilderErrorCode,
  ConversationRoundStatus,
  ConversationRoundStepType,
  TimelineEventType,
  attachmentTools,
} from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { createEmptyConversation, createRound } from '../../../test_utils';
import { reconcileAttachments, reconcileEvents } from './round_writes';
import {
  agentActor,
  executionStartedEvent,
  roundToEvents,
  userMessageEvent,
} from './rounds_to_events';

describe('reconcileEvents', () => {
  const conversation = createEmptyConversation({ id: 'c1', agent_id: 'agent' });
  const T0 = '2024-01-01T00:00:00.000Z';
  const T1 = '2024-01-01T00:00:01.000Z';
  const completedRound = (parts: Partial<ConversationRound>) =>
    createRound({ status: ConversationRoundStatus.completed, ...parts });

  /** A stored `exec_0` that failed: user_message, execution_started, execution_failed. */
  const failedBlock = (): TimelineEvent[] => [
    userMessageEvent({ id: 'r1', input: { message: 'hi' }, started_at: T0 }, conversation),
    executionStartedEvent({ id: 'r1', started_at: T0 }, conversation),
    {
      id: 'r1::execution_failed',
      type: TimelineEventType.executionFailed,
      created_at: T1,
      actor: agentActor(conversation),
      execution_id: 'r1::execution',
      trigger_event_id: 'r1::user_message',
      data: { error: { code: 'internalError', message: 'boom' } },
    } as TimelineEvent,
  ];

  const ids = (events: ConversationEvent[]) => events.map((event) => event.id);

  /** `storedRounds` defaults to none materialised: the stored document predates the caller's view. */
  const reconcile = (merged: Conversation, storedRounds: ConversationRound[] = []) =>
    reconcileEvents(merged, storedRounds);

  it('preserves a stored round block with no execution_terminated (interrupted execution)', () => {
    const result = reconcile({ ...conversation, rounds: [], events: failedBlock() });
    expect(ids(result)).toEqual([
      'r1::user_message',
      'r1::execution_started',
      'r1::execution_failed',
    ]);
  });

  it('preserves an in-progress round block (receipt-time user_message only)', () => {
    const stored = [
      userMessageEvent({ id: 'r1', input: { message: 'hi' }, started_at: T0 }, conversation),
    ];
    const result = reconcile({ ...conversation, rounds: [], events: stored });
    expect(ids(result)).toEqual(['r1::user_message']);
  });

  it('drops a stored block that folds into a complete round absent from rounds (deleted round)', () => {
    const stored = roundToEvents(completedRound({ id: 'r1', started_at: T0 }), conversation);
    expect(stored.at(-1)!.id).toBe('r1::execution_terminated'); // fixture sanity
    expect(reconcile({ ...conversation, rounds: [], events: stored })).toEqual([]);
  });

  it('regenerates an in-progress round that IS in rounds (unchanged behaviour)', () => {
    const r1 = createRound({ id: 'r1', started_at: T0 }); // inProgress: no terminal
    const result = reconcile({
      ...conversation,
      rounds: [r1],
      events: roundToEvents(r1, conversation),
    });
    expect(ids(result)).toEqual(['r1::user_message', 'r1::execution_started']);
  });

  it('keeps a preserved block contiguous and at its stored position relative to regenerated rounds', () => {
    const T5 = '2024-01-01T00:00:05.000Z';
    const r2 = completedRound({ id: 'r2', started_at: T5, time_to_last_token: 1000 });
    const stored = [...failedBlock(), ...roundToEvents(r2, conversation)];
    const result = reconcile({ ...conversation, rounds: [r2], events: stored });
    expect(ids(result)).toEqual([
      'r1::user_message',
      'r1::execution_started',
      'r1::execution_failed',
      'r2::user_message',
      'r2::execution_started',
      'r2::execution_terminated',
    ]);
  });

  it('keeps stored order when a preserved block shares timestamps with a regenerated round', () => {
    // failed block at T0 (terminal at T1) and r2 also starting at T0: stored order wins, block first
    const r2 = completedRound({ id: 'r2', started_at: T0, time_to_last_token: 500 });
    const stored = [...failedBlock(), ...roundToEvents(r2, conversation)];
    const result = reconcile({ ...conversation, rounds: [r2], events: stored });
    expect(ids(result)).toEqual([
      'r1::user_message',
      'r1::execution_started',
      'r1::execution_failed',
      'r2::user_message',
      'r2::execution_started',
      'r2::execution_terminated',
    ]);
  });

  it('keeps stored order when a regenerated round is stored before a preserved block', () => {
    const r0 = completedRound({ id: 'r0', started_at: T0, time_to_last_token: 500 });
    const stored = [...roundToEvents(r0, conversation), ...failedBlock()];
    const result = reconcile({ ...conversation, rounds: [r0], events: stored });
    expect(ids(result)).toEqual([
      'r0::user_message',
      'r0::execution_started',
      'r0::execution_terminated',
      'r1::user_message',
      'r1::execution_started',
      'r1::execution_failed',
    ]);
  });

  it('appends a new round (no stored events yet) after the stored blocks', () => {
    const T5 = '2024-01-01T00:00:05.000Z';
    const r2 = completedRound({ id: 'r2', started_at: T5, time_to_last_token: 0 });
    const result = reconcile({ ...conversation, rounds: [r2], events: failedBlock() });
    expect(ids(result)).toEqual([
      'r1::user_message',
      'r1::execution_started',
      'r1::execution_failed',
      'r2::user_message',
      'r2::execution_started',
      'r2::execution_terminated',
    ]);
  });

  it('still re-inserts additive events by created_at', () => {
    const additive = {
      id: 'additive-1',
      type: TimelineEventType.attachmentAdded,
      created_at: '2024-01-01T00:00:00.500Z',
      actor: agentActor(conversation),
      data: {},
    } as unknown as TimelineEvent;
    const result = reconcile({
      ...conversation,
      rounds: [],
      events: [...failedBlock(), additive],
    });
    expect(ids(result)).toEqual([
      'r1::user_message',
      'r1::execution_started',
      'additive-1',
      'r1::execution_failed',
    ]);
  });

  describe('interrupted blocks', () => {
    it('keeps an interrupted exec_0 block absent from the caller rounds (stale stored rounds)', () => {
      const r0 = completedRound({ id: 'r0', started_at: T0 });
      const result = reconcile({
        ...conversation,
        rounds: [r0],
        events: [...roundToEvents(r0, conversation), ...failedBlock()],
      });
      expect(ids(result)).toEqual(
        expect.arrayContaining([
          'r1::user_message',
          'r1::execution_started',
          'r1::execution_failed',
        ])
      );
    });

    it('drops an interrupted round the caller removed once the stored rounds materialised it', () => {
      const r0 = completedRound({ id: 'r0', started_at: T0 });
      const materialisedR1 = completedRound({
        id: 'r1',
        started_at: T0,
        interruption: {
          type: 'failed',
          error: { code: AgentBuilderErrorCode.internalError, message: 'boom' },
        },
      });
      const result = reconcile(
        {
          ...conversation,
          rounds: [r0],
          events: [...roundToEvents(r0, conversation), ...failedBlock()],
        },
        [r0, materialisedR1]
      );
      expect(ids(result).some((id) => id.startsWith('r1::'))).toBe(false);
      expect(ids(result)).toEqual([
        'r0::user_message',
        'r0::execution_started',
        'r0::execution_terminated',
      ]);
    });

    it('drops an interrupted round the caller removed even when stored last (aborted resume)', () => {
      const r0 = completedRound({ id: 'r0', started_at: T0 });
      const r2 = completedRound({ id: 'r2', started_at: T1 });
      const abortedBlock = failedBlock().map((event) =>
        event.type === TimelineEventType.executionFailed
          ? ({
              ...event,
              id: 'r1::execution_aborted',
              type: TimelineEventType.executionAborted,
              data: { aborted_by: { source: 'api' } },
            } as TimelineEvent)
          : event
      );
      const materialisedR1 = completedRound({
        id: 'r1',
        started_at: T0,
        interruption: { type: 'aborted', aborted_by: { source: 'api' } },
      });
      const result = reconcile(
        {
          ...conversation,
          rounds: [r0, r2],
          events: [
            ...roundToEvents(r0, conversation),
            ...abortedBlock,
            ...roundToEvents(r2, conversation),
          ],
        },
        [r0, materialisedR1, r2]
      );
      expect(ids(result).some((id) => id.startsWith('r1::'))).toBe(false);
      expect(ids(result)).toEqual([
        'r0::user_message',
        'r0::execution_started',
        'r0::execution_terminated',
        'r2::user_message',
        'r2::execution_started',
        'r2::execution_terminated',
      ]);
    });

    it('keeps an interrupted round the caller kept in rounds (materialised, not removed)', () => {
      const materialisedR1 = completedRound({
        id: 'r1',
        started_at: T0,
        interruption: {
          type: 'failed',
          error: { code: AgentBuilderErrorCode.internalError, message: 'boom' },
        },
      });
      const result = reconcile(
        { ...conversation, rounds: [materialisedR1], events: failedBlock() },
        [materialisedR1]
      );
      expect(ids(result)).toEqual([
        'r1::user_message',
        'r1::execution_started',
        'r1::execution_failed',
      ]);
    });

    it('still drops a completed round the caller removed from rounds', () => {
      const r0 = completedRound({ id: 'r0', started_at: T0 });
      const r1 = completedRound({ id: 'r1', started_at: T1 });
      const result = reconcile({
        ...conversation,
        rounds: [r0],
        events: [...roundToEvents(r0, conversation), ...roundToEvents(r1, conversation)],
      });
      expect(ids(result).some((id) => id.startsWith('r1::'))).toBe(false);
    });

    it('keeps a block whose exec_0 paused and exec_1 was interrupted (last terminal is interrupted)', () => {
      const r0 = completedRound({ id: 'r0', started_at: T0 });
      const paused = roundToEvents(
        createRound({
          id: 'r2',
          started_at: T0,
          status: ConversationRoundStatus.awaitingPrompt,
          pending_prompts: [],
        }),
        conversation
      );
      const resumeFailed = [
        {
          id: 'r2::prompt_response::1',
          type: TimelineEventType.promptResponse,
          created_at: T1,
          actor: { type: 'user', id: 'u1' },
          data: { prompt_requested_event_id: 'r2::execution_terminated', responses: {} },
        },
        {
          id: 'r2::execution::1::execution_started',
          type: TimelineEventType.executionStarted,
          created_at: T1,
          actor: agentActor(conversation),
          execution_id: 'r2::execution::1',
          trigger_event_id: 'r2::prompt_response::1',
          data: { trigger_type: 'prompt_response' },
        },
        {
          id: 'r2::execution::1::execution_failed',
          type: TimelineEventType.executionFailed,
          created_at: T1,
          actor: agentActor(conversation),
          execution_id: 'r2::execution::1',
          trigger_event_id: 'r2::prompt_response::1',
          data: { time_to_last_token: 1, error: { code: 'internalError', message: 'boom' } },
        },
      ] as ConversationEvent[];
      const result = reconcile({
        ...conversation,
        rounds: [r0],
        events: [...roundToEvents(r0, conversation), ...paused, ...resumeFailed],
      });
      expect(ids(result)).toEqual(
        expect.arrayContaining(['r2::execution_terminated', 'r2::execution::1::execution_failed'])
      );
    });
  });
});

describe('reconcileAttachments', () => {
  const attachment = (id: string, overrides: Record<string, unknown> = {}) =>
    ({
      id,
      versions: [],
      current_version: 1,
      active: true,
      ...overrides,
    } as unknown as VersionedAttachment);

  it('keeps an attachment the operation created', () => {
    const created = attachment('created');

    expect(reconcileAttachments({ snapshot: [], stored: [], produced: [created] })).toEqual([
      created,
    ]);
  });

  it('keeps an attachment added concurrently', () => {
    const concurrent = attachment('concurrent');

    expect(reconcileAttachments({ snapshot: [], stored: [concurrent], produced: [] })).toEqual([
      concurrent,
    ]);
  });

  it('keeps an edit the operation made to a pre-existing attachment', () => {
    // the round updated X in memory; nothing has written it yet, so `stored`
    // still holds the old record and would otherwise silently win
    const original = attachment('X', { current_version: 1 });
    const edited = attachment('X', { current_version: 2 });

    expect(
      reconcileAttachments({ snapshot: [original], stored: [original], produced: [edited] })
    ).toEqual([edited]);
  });

  it('keeps an edit that does not bump the version', () => {
    // description, hidden, readonly and soft deletes all mutate without bumping
    const original = attachment('X', { description: 'before' });
    const renamed = attachment('X', { description: 'after' });

    expect(
      reconcileAttachments({ snapshot: [original], stored: [original], produced: [renamed] })
    ).toEqual([renamed]);

    const deleted = attachment('X', { description: 'before', active: false });

    expect(
      reconcileAttachments({ snapshot: [original], stored: [original], produced: [deleted] })
    ).toEqual([deleted]);
  });

  it('yields to a concurrent edit of an attachment the operation only carried along', () => {
    const original = attachment('X', { description: 'before' });
    const concurrentlyRenamed = attachment('X', { description: 'renamed by someone else' });

    expect(
      reconcileAttachments({
        snapshot: [original],
        stored: [concurrentlyRenamed],
        produced: [original],
      })
    ).toEqual([concurrentlyRenamed]);
  });

  it('respects a concurrent removal of an attachment it only carried along', () => {
    const original = attachment('X');

    expect(
      reconcileAttachments({ snapshot: [original], stored: [], produced: [original] })
    ).toEqual([]);
  });

  it('removes an attachment the producer started from and dropped (permanent delete)', () => {
    const kept = attachment('kept');
    const purged = attachment('purged');

    expect(
      reconcileAttachments({
        snapshot: [kept, purged],
        stored: [kept, purged],
        produced: [kept],
      })
    ).toEqual([kept]);
  });

  it('keeps a stored attachment the producer never saw (concurrent add)', () => {
    const kept = attachment('kept');
    const concurrent = attachment('concurrent');

    expect(
      reconcileAttachments({ snapshot: [kept], stored: [kept, concurrent], produced: [kept] })
    ).toEqual([kept, concurrent]);
  });

  it('keeps both an operation edit and a concurrent edit to different attachments', () => {
    const untouched = attachment('untouched', { description: 'before' });
    const concurrentlyRenamed = attachment('untouched', { description: 'after' });
    const original = attachment('edited', { current_version: 1 });
    const edited = attachment('edited', { current_version: 2 });

    const result = reconcileAttachments({
      snapshot: [untouched, original],
      stored: [concurrentlyRenamed, original],
      produced: [untouched, edited],
    });

    expect(result).toEqual([concurrentlyRenamed, edited]);
  });

  describe('permanent-delete guard against the rounds stored at write time', () => {
    const referencingRound = (attachmentId: string) =>
      createRound({
        id: 'round-ref',
        steps: [
          {
            type: ConversationRoundStepType.toolCall,
            tool_call_id: 'tc-1',
            tool_id: attachmentTools.read,
            params: { attachment_id: attachmentId },
            results: [],
          } as unknown as ConversationRoundStep,
        ],
      });

    it('rejects removing an attachment that a stored round now references (stale eligibility check)', () => {
      const purged = attachment('purged');

      expect(() =>
        reconcileAttachments({
          snapshot: [purged],
          stored: [purged],
          produced: [],
          storedRounds: [referencingRound('purged')],
        })
      ).toThrow(
        expect.objectContaining({
          code: 'attachmentPermanentDeleteBlocked',
          meta: expect.objectContaining({ reason: 'referenced_in_rounds' }),
        })
      );
    });

    it('allows the removal when no stored round references the attachment', () => {
      const purged = attachment('purged');

      expect(
        reconcileAttachments({
          snapshot: [purged],
          stored: [purged],
          produced: [],
          storedRounds: [referencingRound('some-other-attachment')],
        })
      ).toEqual([]);
    });

    it('does not guard when storedRounds is omitted (in-execution producers never remove)', () => {
      const purged = attachment('purged');

      expect(reconcileAttachments({ snapshot: [purged], stored: [purged], produced: [] })).toEqual(
        []
      );
    });
  });
});

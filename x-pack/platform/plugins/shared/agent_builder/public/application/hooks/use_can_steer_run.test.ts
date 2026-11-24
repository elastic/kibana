/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { of } from 'rxjs';
import {
  EventActorType,
  TimelineEventType,
  type ConversationEvent,
} from '@kbn/agent-builder-common';
import type { TimelineDisplayEvent } from '../../services/events';
import { useCanSteerRun } from './use_can_steer_run';
import { useConversation } from './use_conversation';
import { useCurrentUser } from './use_current_user';
import { useLiveEvents$ } from './use_live_events';

jest.mock('./use_conversation', () => ({ useConversation: jest.fn() }));
jest.mock('./use_current_user', () => ({ useCurrentUser: jest.fn() }));
jest.mock('./use_live_events', () => ({ useLiveEvents$: jest.fn() }));

const mockedUseConversation = jest.mocked(useConversation);
const mockedUseCurrentUser = jest.mocked(useCurrentUser);
const mockedUseLiveEvents$ = jest.mocked(useLiveEvents$);

const me = { type: EventActorType.user, id: 'me', username: 'me' };
const someoneElse = { type: EventActorType.user, id: 'them', username: 'them' };

const ask = (id: string, actor: typeof me): ConversationEvent =>
  ({
    id,
    type: TimelineEventType.userMessage,
    created_at: '2026-01-01T00:00:00.000Z',
    actor,
    data: { message: 'go' },
  } as ConversationEvent);

const started = (id: string, executionId: string, triggerId: string): ConversationEvent =>
  ({
    id,
    type: TimelineEventType.executionStarted,
    created_at: '2026-01-01T00:00:01.000Z',
    actor: { type: EventActorType.agent, id: 'agent-1' },
    execution_id: executionId,
    trigger_event_id: triggerId,
    data: { trigger_type: 'user_message' },
  } as ConversationEvent);

const arrange = ({
  saved = [],
  live = [],
  uid = 'me',
}: {
  saved?: ConversationEvent[];
  live?: ConversationEvent[];
  uid?: string | null;
}) => {
  mockedUseConversation.mockReturnValue({ conversation: { events: saved } } as never);
  mockedUseLiveEvents$.mockReturnValue(of(live as TimelineDisplayEvent[]));
  mockedUseCurrentUser.mockReturnValue({
    currentUser: uid === null ? null : ({ uid } as never),
    isLoading: false,
  });
  return renderHook(() => useCanSteerRun()).result.current;
};

describe('useCanSteerRun', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows a steer when no run has started', () => {
    expect(arrange({ saved: [ask('a1', someoneElse)] })).toBe(true);
  });

  it('allows the user whose message started the latest run', () => {
    expect(arrange({ saved: [ask('a1', me), started('s1', 'r1::execution', 'a1')] })).toBe(true);
  });

  it('refuses anyone else', () => {
    expect(arrange({ saved: [ask('a1', someoneElse), started('s1', 'r1::execution', 'a1')] })).toBe(
      false
    );
  });

  it('judges by the latest run, not an earlier one', () => {
    expect(
      arrange({
        saved: [
          ask('a1', me),
          started('s1', 'r1::execution', 'a1'),
          ask('a2', someoneElse),
          started('s2', 'r2::execution', 'a2'),
        ],
      })
    ).toBe(false);
  });

  it('reads a start that only the live stream holds against the saved trigger', () => {
    expect(
      arrange({
        saved: [ask('a1', someoneElse)],
        live: [started('s1', 'r1::execution', 'a1')],
      })
    ).toBe(false);
  });

  it('allows a steer while the trigger of the latest run is not in the timeline yet', () => {
    expect(arrange({ live: [started('s1', 'r1::execution', 'a-pending')] })).toBe(true);
  });

  it('leaves the decision to the server without a current user', () => {
    expect(
      arrange({ saved: [ask('a1', someoneElse), started('s1', 'r1::execution', 'a1')], uid: null })
    ).toBe(true);
  });
});

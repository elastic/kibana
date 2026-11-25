/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SessionEventInput,
  SessionEventsService,
  SessionTurn,
  StoredSessionEvent,
} from '../session_events/types';
import {
  buildTurnTranscript,
  decodeAfter,
  encodeAfter,
  readSessionTranscripts,
} from './session_transcripts';

const event = (raw: SessionEventInput): StoredSessionEvent =>
  ({
    '@timestamp': '2026-11-16T09:00:00.000Z',
    event_at: raw.event_at,
    id: raw.id,
    session_id: 'session-1',
    turn_id: raw.turn_id,
    raw,
  } as unknown as StoredSessionEvent);

const base = { turn_id: 'turn-1', event_at: '2026-11-16T08:59:00.000Z' };

const turnOf = (
  turnId: string,
  text: string,
  endedAt = '2026-11-16T09:00:00.000Z'
): SessionTurn => ({
  sessionId: 'session-1',
  turnId,
  userId: 'jdoe',
  endedAt,
  events: [event({ type: 'user', id: `${turnId}-u`, content: text, ...base, turn_id: turnId })],
});

const answered = (turnId: string, text: string, endedAt?: string): SessionTurn => {
  const turn = turnOf(turnId, text, endedAt);
  return {
    ...turn,
    events: [
      ...turn.events,
      event({ type: 'assistant', id: `${turnId}-a`, content: 'Noted.', ...base, turn_id: turnId }),
    ],
  };
};

const position = (turnId: string, eventId: string, savedAt = '2026-11-16T09:00:00.000Z') => ({
  savedAt,
  sessionId: 'session-1',
  eventId,
  turnId,
});

describe('buildTurnTranscript', () => {
  it('renders what was said, the tools called with their results, and the answer', () => {
    const transcript = buildTurnTranscript([
      event({ type: 'user', id: 'u', content: 'Why is checkout slow?', ...base }),
      event({ type: 'reasoning', id: 'r', content: 'thinking hard', ...base }),
      event({
        type: 'assistant',
        id: 'a-1',
        tool_calls: [{ id: 'c-1', name: 'search', args: { q: 'pool limit' } }],
        ...base,
      }),
      event({
        type: 'tool',
        id: 't',
        tool_call_id: 'c-1',
        tool_name: 'search',
        result: { hits: 3 },
        status: 'successful',
        ...base,
      }),
      event({
        type: 'tool',
        id: 't-2',
        tool_call_id: 'c-2',
        tool_name: 'lookup',
        result: 'nope',
        status: 'failed',
        ...base,
      }),
      event({ type: 'meta', id: 'm', ...base }),
      event({ type: 'assistant', id: 'a-2', content: 'The pool limit.', ...base }),
    ]);

    expect(transcript).toBe(
      [
        'User: Why is checkout slow?',
        'Assistant called search: {"q":"pool limit"}',
        'Tool result (search): {"hits":3}',
        'Tool result (lookup, failed): nope',
        'Assistant: The pool limit.',
      ].join('\n')
    );
  });

  it('returns nothing for a turn nobody said anything in', () => {
    expect(
      buildTurnTranscript([
        event({ type: 'user', id: 'u', content: '  ', ...base }),
        event({ type: 'reasoning', id: 'r', content: 'x', ...base }),
      ])
    ).toBeUndefined();
    expect(buildTurnTranscript([])).toBeUndefined();
  });
});

describe('the read cursor', () => {
  it('round-trips an event, and rejects anything else', () => {
    expect(decodeAfter(encodeAfter({ sessionId: 's"1', eventId: 'e|1' }))).toEqual({
      sessionId: 's"1',
      eventId: 'e|1',
    });
    expect(decodeAfter('not json')).toBeUndefined();
    expect(decodeAfter('["only-one"]')).toBeUndefined();
    expect(decodeAfter('[1,2]')).toBeUndefined();
  });
});

describe('readSessionTranscripts', () => {
  const readTurns = jest.fn();
  const sessionEvents = { readTurns } as unknown as SessionEventsService;
  const params = {
    sessionEvents,
    spaceId: 'team-a',
    aiIndexId: 'support',
    since: '2026-11-16T00:00:00.000Z',
    until: '2026-11-16T09:55:00.000Z',
    size: 100,
  };

  beforeEach(() => {
    readTurns.mockReset();
  });

  it('reads each turn as a transcript memory visible in the space, and resumes at the end of the window', async () => {
    readTurns.mockResolvedValue({
      positions: [position('turn-1', 'turn-1-u'), position('turn-1', 'turn-1-a')],
      turns: [answered('turn-1', 'I always want vegetarian meals.')],
      full: false,
    });

    const result = await readSessionTranscripts({
      ...params,
      after: encodeAfter({ sessionId: 'session-1', eventId: 'e-0' }),
    });

    expect(readTurns).toHaveBeenCalledWith({
      space: 'team-a',
      aiIndexId: 'support',
      since: params.since,
      after: { sessionId: 'session-1', eventId: 'e-0' },
      until: params.until,
      size: 100,
    });
    expect(result).toEqual({
      memories: [
        {
          id: 'session:session-1/turn-1',
          type: 'session.turn',
          title: 'Agent conversation, turn ending 2026-11-16T09:00:00.000Z',
          content: 'User: I always want vegetarian meals.\nAssistant: Noted.',
          updated_at: '2026-11-16T09:00:00.000Z',
          user_id: 'jdoe',
          attributes: { 'session.id': 'session-1', 'session.turn_id': 'turn-1' },
          permissions: { kibana: { privileges: [{ space: 'team-a' }] } },
        },
      ],
      resume_from: params.until,
      skipped: 0,
    });
  });

  it('counts turns nobody spoke in as skipped', async () => {
    readTurns.mockResolvedValue({
      positions: [position('turn-1', 'turn-1-u')],
      turns: [{ ...turnOf('turn-1', ' ') }],
      full: false,
    });

    const result = await readSessionTranscripts(params);

    expect(result).toEqual({ memories: [], resume_from: params.until, skipped: 1 });
  });

  it('resumes after the last event it looked at when the read was full', async () => {
    readTurns.mockResolvedValue({
      positions: [
        position('turn-1', 'turn-1-u', '2026-11-16T09:00:00.000Z'),
        position('turn-1', 'turn-1-a', '2026-11-16T09:01:00.000Z'),
      ],
      turns: [answered('turn-1', 'hello')],
      full: true,
    });

    const result = await readSessionTranscripts(params);

    expect(result.resume_from).toBe('2026-11-16T09:01:00.000Z');
    expect(decodeAfter(result.resume_after ?? '')).toEqual({
      sessionId: 'session-1',
      eventId: 'turn-1-a',
    });
  });

  it('stops before the first event of a turn the token budget left out, and always reads one turn', async () => {
    readTurns.mockResolvedValue({
      positions: [
        position('turn-1', 'turn-1-u', '2026-11-16T09:00:00.000Z'),
        position('turn-2', 'turn-2-u', '2026-11-16T09:02:00.000Z'),
        position('turn-1', 'turn-1-a', '2026-11-16T09:03:00.000Z'),
      ],
      turns: [answered('turn-1', 'x'.repeat(400)), answered('turn-2', 'y'.repeat(400))],
      full: false,
    });

    const result = await readSessionTranscripts({ ...params, maxTokens: 1 });

    expect(result.memories.map(({ id }) => id)).toEqual(['session:session-1/turn-1']);
    expect(result.resume_from).toBe('2026-11-16T09:00:00.000Z');
    expect(decodeAfter(result.resume_after ?? '')).toEqual({
      sessionId: 'session-1',
      eventId: 'turn-1-u',
    });
  });

  it('reads nothing, keeping the cursor, when the window is empty', async () => {
    const after = encodeAfter({ sessionId: 'session-1', eventId: 'e-0' });

    await expect(
      readSessionTranscripts({ ...params, since: params.until, after })
    ).resolves.toEqual({
      memories: [],
      resume_from: params.until,
      resume_after: after,
      skipped: 0,
    });
    expect(readTurns).not.toHaveBeenCalled();
  });
});

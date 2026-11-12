/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LongMemEvalSConfig } from '../config';
import type { LongMemEvalRecord } from './longmemeval_s';
import {
  parseLongMemEvalDate,
  selectConversations,
  selectQuestions,
  sessionToRounds,
  targetsOf,
} from './longmemeval_s';

const options: LongMemEvalSConfig = {
  url: 'https://example.com/longmemeval_s.json',
  agent: { id: 'longmemeval-assistant', name: 'Personal assistant' },
  samples: [],
  sample_count: 1,
  all_samples: false,
  include_abstention: false,
  sessions: 'haystack',
  distractor_sessions: 1,
};

const chat = (user: string) => [
  { role: 'user', content: user },
  { role: 'assistant', content: `Noted: ${user}` },
];

const record = (
  id: string,
  type: string,
  sessions: Array<{ id: string; date: string; answer?: boolean }>
): LongMemEvalRecord => ({
  question_id: id,
  question_type: type,
  question: `Question ${id}?`,
  question_date: '2023/05/30 (Tue) 23:40',
  answer: `Answer ${id}`,
  answer_session_ids: sessions.filter(({ answer }) => answer).map((session) => session.id),
  haystack_dates: sessions.map(({ date }) => date),
  haystack_session_ids: sessions.map((session) => session.id),
  haystack_sessions: sessions.map((session) => chat(`I said ${session.id}`)),
});

describe('LongMemEval S', () => {
  it('reads its dates as UTC', () => {
    expect(parseLongMemEvalDate('2023/05/20 (Sat) 02:21')).toBe('2023-05-20T02:21:00.000Z');
    expect(() => parseLongMemEvalDate('May 20')).toThrow("Unrecognized LongMemEval date 'May 20'");
  });

  it('takes the first samples, or all of them, leaving out abstention questions unless asked', () => {
    const records = [
      record('a_abs', 'single-session-user', []),
      record('a', 'single-session-user', []),
      record('b', 'single-session-user', []),
      record('c', 'multi-session', []),
    ];
    const ids = (selected: LongMemEvalRecord[]) => selected.map((q) => q.question_id);

    expect(ids(selectQuestions(records, options))).toEqual(['a']);
    expect(ids(selectQuestions(records, { ...options, sample_count: 2 }))).toEqual(['a', 'b']);
    expect(ids(selectQuestions(records, { ...options, all_samples: true }))).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(
      ids(selectQuestions(records, { ...options, all_samples: true, include_abstention: true }))
    ).toEqual(['a_abs', 'a', 'b', 'c']);
  });

  it('takes the listed samples, in their order, and fails on one it does not have', () => {
    const records = [record('a', 'x', []), record('b_abs', 'y', [])];

    expect(
      selectQuestions(records, { ...options, samples: ['b_abs', 'a'] }).map((q) => q.question_id)
    ).toEqual(['b_abs', 'a']);
    expect(() => selectQuestions(records, { ...options, samples: ['z'] })).toThrow(
      'longmemeval_s has no samples z'
    );
  });

  it('makes a round of each user message and the assistant messages after it', () => {
    const rounds = sessionToRounds(
      [
        { role: 'assistant', content: 'Hello before anyone spoke' },
        { role: 'user', content: 'I moved to Lisbon.' },
        { role: 'assistant', content: 'Nice.' },
        { role: 'assistant', content: 'Anything else?' },
        { role: 'user', content: 'No.' },
      ],
      '2023-05-20T02:21:00.000Z'
    );

    expect(rounds).toEqual([
      {
        startedAt: '2023-05-20T02:21:00.000Z',
        user: 'I moved to Lisbon.',
        steps: [],
        answer: 'Nice.\n\nAnything else?',
      },
      { startedAt: '2023-05-20T02:23:00.000Z', user: 'No.', steps: [], answer: '' },
    ]);
  });

  const first = record('a', 'x', [
    { id: 'noise-1', date: '2023/05/02 (Tue) 10:00' },
    { id: 'noise-2', date: '2023/05/03 (Wed) 10:00' },
    { id: 'answer-a', date: '2023/05/01 (Mon) 10:00', answer: true },
  ]);
  const second = record('b', 'y', [
    { id: 'noise-1', date: '2023/05/02 (Tue) 10:00' },
    { id: 'answer-b', date: '2023/05/04 (Thu) 10:00', answer: true },
  ]);

  it("imports each sample's whole haystack, each session once and in time order", () => {
    expect(selectConversations([first, second], options).map(({ id }) => id)).toEqual([
      'answer-a',
      'noise-1',
      'noise-2',
      'answer-b',
    ]);
  });

  it('imports only the sessions that hold answers and a distractor per sample, when asked', () => {
    const conversations = selectConversations([first, second], { ...options, sessions: 'answers' });

    expect(conversations.map(({ id }) => id)).toEqual(['answer-a', 'noise-1', 'answer-b']);
    expect(conversations[0]).toEqual({
      id: 'answer-a',
      title: 'Chat on 2023-05-01',
      rounds: [
        {
          startedAt: '2023-05-01T10:00:00.000Z',
          user: 'I said answer-a',
          steps: [],
          answer: 'Noted: I said answer-a',
        },
      ],
    });
  });

  it('turns each question into a target with its answer, when it is asked and where the answer is', () => {
    const question = record('a', 'temporal-reasoning', [
      { id: 's1', date: '2023/05/01 (Mon) 10:00', answer: true },
    ]);

    expect(targetsOf([question])).toEqual([
      {
        id: 'a',
        dataset: 'longmemeval_s',
        category: 'temporal-reasoning',
        question: 'Question a?',
        answer: 'Answer a',
        askedAt: '2023-05-30T23:40:00.000Z',
        evidence: ['s1'],
      },
    ]);
  });
});

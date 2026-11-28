/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertNoGoldFields,
  buildSuiteData,
  normalizeHistory,
  opaqueSessionId,
  parseLongMemEvalTimestamp,
  resolveSelectedIds,
  validateSourceRecords,
  verifySourceBuffer,
} from './dataset';
import { DATASET_NAME } from './constants';

const sourceRecord = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  question_id: 'q1',
  question_type: 'single-session-user',
  question: 'What colour is my bike?',
  question_date: '2023/05/30 (Tue) 20:36',
  answer: 'Red',
  answer_session_ids: ['answer_abc'],
  haystack_session_ids: ['noise_1', 'answer_abc'],
  haystack_dates: ['2023/05/20 (Sat) 10:00', '2023/05/22 (Mon) 21:18'],
  haystack_sessions: [
    [
      { role: 'user', content: 'Hello there' },
      { role: 'assistant', content: 'Hi!' },
    ],
    [
      { role: 'user', content: 'I painted my bike red', has_answer: true },
      { role: 'assistant', content: 'Nice colour.' },
    ],
  ],
  ...overrides,
});

describe('parseLongMemEvalTimestamp', () => {
  const context = { field: 'question_date', questionId: 'q1' };

  it('renders a timezone-free ISO minute timestamp', () => {
    expect(parseLongMemEvalTimestamp('2023/05/30 (Tue) 20:36', context)).toBe('2023-05-30T20:36');
  });

  it('rejects other formats and impossible dates', () => {
    expect(() => parseLongMemEvalTimestamp('2023-05-30 20:36', context)).toThrow(/unsupported/);
    expect(() => parseLongMemEvalTimestamp('2023/02/30 (Thu) 10:00', context)).toThrow(/real date/);
    expect(() => parseLongMemEvalTimestamp(42, context)).toThrow(/must be a string/);
  });
});

describe('validateSourceRecords', () => {
  it('accepts valid records and stringifies integer answers', () => {
    const [record] = validateSourceRecords([sourceRecord({ answer: 3 })], 1);
    expect(record.answer).toBe('3');
    expect(record.questionType).toBe('single-session-user');
  });

  it('rejects a wrong record count, duplicates and unknown question types', () => {
    expect(() => validateSourceRecords([sourceRecord()], 2)).toThrow(/must contain 2/);
    expect(() => validateSourceRecords([sourceRecord(), sourceRecord()], 2)).toThrow(/Duplicate/);
    expect(() => validateSourceRecords([sourceRecord({ question_type: 'other' })], 1)).toThrow(
      /unsupported question_type/
    );
  });

  it('rejects evidence absent from the haystack and mismatched parallel arrays', () => {
    expect(() =>
      validateSourceRecords([sourceRecord({ answer_session_ids: ['missing'] })], 1)
    ).toThrow(/absent from history/);
    expect(() =>
      validateSourceRecords([sourceRecord({ haystack_dates: ['2023/05/20 (Sat) 10:00'] })], 1)
    ).toThrow(/differ in length/);
  });
});

describe('normalizeHistory', () => {
  it('uses opaque source-order session IDs and drops has_answer', () => {
    const [record] = validateSourceRecords([sourceRecord()], 1);
    const history = normalizeHistory(record);

    expect(history.sessions.map(({ sessionId }) => sessionId)).toEqual([
      'session-0000',
      'session-0001',
    ]);
    expect(history.sessions[1]).toEqual({
      sourceIndex: 1,
      sessionId: 'session-0001',
      occurredAtRaw: '2023/05/22 (Mon) 21:18',
      occurredAt: '2023-05-22T21:18',
      messages: [
        { role: 'user', content: 'I painted my bike red' },
        { role: 'assistant', content: 'Nice colour.' },
      ],
    });
    expect(JSON.stringify(history)).not.toContain('answer_abc');
  });

  it('rejects unknown message fields and roles', () => {
    const withExtraField = sourceRecord({
      haystack_sessions: [
        [{ role: 'user', content: 'x', extra: 1 }],
        [{ role: 'user', content: 'y' }],
      ],
    });
    const [extraRecord] = validateSourceRecords([withExtraField], 1);
    expect(() => normalizeHistory(extraRecord)).toThrow(/unsupported fields: extra/);

    const withBadRole = sourceRecord({
      haystack_sessions: [[{ role: 'system', content: 'x' }], [{ role: 'user', content: 'y' }]],
    });
    const [roleRecord] = validateSourceRecords([withBadRole], 1);
    expect(() => normalizeHistory(roleRecord)).toThrow(/user\/assistant role/);
  });
});

describe('assertNoGoldFields', () => {
  it('finds label keys at any depth', () => {
    expect(() => assertNoGoldFields({ sessions: [{ messages: [{ has_answer: true }] }] })).toThrow(
      /history\.sessions\[0\]\.messages\[0\]: has_answer/
    );
    expect(() =>
      assertNoGoldFields({ sessions: [{ messages: [{ role: 'user' }] }] })
    ).not.toThrow();
  });
});

describe('buildSuiteData', () => {
  const records = validateSourceRecords(
    [sourceRecord(), sourceRecord({ question_id: 'q2_abs', answer: 'You never said.' })],
    2
  );

  it('splits examples from histories and keeps the selected order', () => {
    const { dataset, histories } = buildSuiteData(records, ['q2_abs', 'q1']);

    expect(dataset.name).toBe(DATASET_NAME);
    expect(dataset.examples.map(({ id }) => id)).toEqual(['q2_abs', 'q1']);
    const [abstention, ordinary] = dataset.examples;
    expect(abstention.metadata.abstention).toBe(true);
    expect(ordinary.metadata.abstention).toBe(false);
    expect(ordinary.input).toEqual({
      question: 'What colour is my bike?',
      questionDate: '2023/05/30 (Tue) 20:36',
    });
    expect(ordinary.output).toEqual({ expected: 'Red' });
    expect(ordinary.metadata.evidenceSessionIds).toEqual([opaqueSessionId(1)]);
    expect(ordinary.metadata.sessionCount).toBe(2);
    expect([...histories.keys()]).toEqual(['q2_abs', 'q1']);
  });

  it('fails when a selected ID is missing', () => {
    expect(() => buildSuiteData(records, ['q1', 'nope'])).toThrow(/not found in source: nope/);
  });
});

describe('verifySourceBuffer', () => {
  it('rejects a file that is not the pinned upstream file', () => {
    expect(() => verifySourceBuffer(Buffer.from('[]'))).toThrow(/size mismatch/);
  });
});

describe('resolveSelectedIds', () => {
  const all = ['a', 'b', 'c'];

  it('returns all IDs without a filter and a subset with one', () => {
    expect(resolveSelectedIds(all, undefined)).toEqual(all);
    expect(resolveSelectedIds(all, ' b , c ')).toEqual(['b', 'c']);
  });

  it('rejects IDs outside the frozen set', () => {
    expect(() => resolveSelectedIds(all, 'a,z')).toThrow(/outside the frozen set: z/);
  });
});

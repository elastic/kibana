/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_AI_INDEX_ID_LENGTH } from '../../common/constants';
import {
  needsMemoryEnabled,
  parseRecallInclude,
  validateRecallIncludeEntry,
  type ParsedRecallInclude,
} from './include';

const parseOk = (entries: readonly string[]): ParsedRecallInclude => {
  const parsed = parseRecallInclude(entries);
  if (!parsed.ok) {
    throw new Error(`Expected ${JSON.stringify(entries)} to parse: ${parsed.error}`);
  }
  return parsed.include;
};

describe('validateRecallIncludeEntry', () => {
  it.each([
    'session_events',
    'session_memory',
    'ai_index:*',
    'ai_index:docs',
    'ai_index:my-docs_2',
    'ai_index:0abc',
    `ai_index:${'a'.repeat(MAX_AI_INDEX_ID_LENGTH)}`,
  ])('accepts %s', (entry) => {
    expect(validateRecallIncludeEntry(entry)).toBeUndefined();
  });

  it.each([
    ['empty', ''],
    ['whitespace', ' '],
    ['padded store', ' session_events'],
    ['unknown store', 'session_traces'],
    ['bare prefix', 'ai_index:'],
    ['double wildcard', 'ai_index:**'],
    ['partial wildcard', 'ai_index:foo*'],
    ['uppercase id', 'ai_index:Docs'],
    ['leading underscore', 'ai_index:_docs'],
    ['leading hyphen', 'ai_index:-docs'],
    ['too long id', `ai_index:${'a'.repeat(MAX_AI_INDEX_ID_LENGTH + 1)}`],
  ])('rejects %s', (_label, entry) => {
    expect(validateRecallIncludeEntry(entry)).toEqual(expect.any(String));
  });
});

describe('parseRecallInclude', () => {
  it('selects only the named stores', () => {
    expect(parseOk(['session_memory'])).toEqual({
      sessionEvents: false,
      sessionMemory: true,
      aiIndices: { kind: 'none' },
    });
  });

  it('deduplicates stores and AI index ids, keeping first-seen order', () => {
    expect(
      parseOk([
        'session_events',
        'ai_index:beta',
        'ai_index:alpha',
        'session_events',
        'ai_index:beta',
      ])
    ).toEqual({
      sessionEvents: true,
      sessionMemory: false,
      aiIndices: { kind: 'ids', ids: ['beta', 'alpha'] },
    });
  });

  it.each([
    ['before', ['ai_index:*', 'ai_index:alpha']],
    ['after', ['ai_index:alpha', 'ai_index:*']],
  ])('lets ai_index:* subsume specific ids listed %s it', (_label, entries) => {
    expect(parseOk(entries).aiIndices).toEqual({ kind: 'all' });
  });

  it('returns an error on an empty list', () => {
    expect(parseRecallInclude([])).toEqual({ ok: false, error: expect.any(String) });
  });

  it('returns an error naming the first invalid entry', () => {
    expect(parseRecallInclude(['session_events', 'ai_index:Bad'])).toEqual({
      ok: false,
      error: expect.stringContaining('[ai_index:Bad]'),
    });
  });
});

describe('needsMemoryEnabled', () => {
  it.each([
    [['session_events'], true],
    [['session_memory'], true],
    [['session_events', 'ai_index:*'], true],
    [['session_memory', 'ai_index:docs'], true],
    [['ai_index:*'], false],
    [['ai_index:docs'], false],
  ])('%j -> %s', (entries, expected) => {
    expect(needsMemoryEnabled(entries)).toBe(expected);
  });
});

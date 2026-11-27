/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { needsMemoryEnabled, parseRecallInclude, validateRecallIncludeEntry } from './include';

describe('validateRecallIncludeEntry', () => {
  it.each([
    'session_events',
    'session_memory',
    'ai_index:*',
    'ai_index:docs',
    'ai_index:my-docs_2',
    'ai_index:0abc',
    `ai_index:${'a'.repeat(256)}`,
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
    ['too long id', `ai_index:${'a'.repeat(257)}`],
  ])('rejects %s', (_label, entry) => {
    expect(validateRecallIncludeEntry(entry)).toEqual(expect.any(String));
  });
});

describe('parseRecallInclude', () => {
  it('selects only the named stores', () => {
    expect(parseRecallInclude(['session_memory'])).toEqual({
      ok: true,
      include: {
        sessionEvents: false,
        sessionMemory: true,
        aiIndices: { kind: 'none' },
      },
    });
  });

  it('deduplicates stores and AI index ids, keeping first-seen order', () => {
    expect(
      parseRecallInclude([
        'session_events',
        'ai_index:beta',
        'ai_index:alpha',
        'session_events',
        'ai_index:beta',
      ])
    ).toEqual({
      ok: true,
      include: {
        sessionEvents: true,
        sessionMemory: false,
        aiIndices: { kind: 'ids', ids: ['beta', 'alpha'] },
      },
    });
  });

  it.each([
    ['before', ['ai_index:*', 'ai_index:alpha']],
    ['after', ['ai_index:alpha', 'ai_index:*']],
  ])('lets ai_index:* subsume specific ids listed %s it', (_label, entries) => {
    const result = parseRecallInclude(entries);
    expect(result).toEqual({
      ok: true,
      include: {
        sessionEvents: false,
        sessionMemory: false,
        aiIndices: { kind: 'all' },
      },
    });
  });

  it('returns an error on an empty list', () => {
    expect(parseRecallInclude([])).toEqual({ ok: false, error: expect.any(String) });
  });

  it('returns an error when any entry is invalid', () => {
    expect(parseRecallInclude(['session_events', 'ai_index:Bad'])).toEqual({
      ok: false,
      error: expect.any(String),
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
    const parsed = parseRecallInclude(entries);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(needsMemoryEnabled(parsed.include)).toBe(expected);
    }
  });
});

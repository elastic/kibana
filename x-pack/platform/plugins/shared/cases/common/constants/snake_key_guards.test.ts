/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SAFE_SNAKE_KEY, AUTHORABLE_SNAKE_KEY, MAX_SNAKE_KEY_LENGTH } from '.';
import { isSafeExtendedFieldKey, isAuthorableExtendedFieldKey } from '../utils/template_fields';

/**
 * Structural tests for the two snake-key guards.
 *
 * These tests defend the guarantee that AUTHORABLE_SNAKE_KEY ⊆ SAFE_SNAKE_KEY, that the
 * delta between them is exactly the characters we intend to tolerate on read only (hyphens),
 * and that both share the same length cap. They catch regressions where someone widens one
 * regex without intending to widen the other, or where a new character slips into one without
 * the other being updated to match.
 *
 * They are NOT an exhaustive charset test — they are a drift-detector for the relationship
 * between the two regexes. If you need to allow a new character, update both regexes (or
 * deliberately add it to READ_TOLERATED_KEY_CHARS only) and update the "delta is exactly"
 * test below to reflect the new intent.
 */
describe('snake-key guard invariants', () => {
  // Probe the regexes at every code point in the Latin-1 range plus a few non-ASCII samples.
  // This is wide enough to catch any accidental widening without being exhaustive over all
  // Unicode. Non-ASCII characters are expected to fail both guards.
  const sampleCodePoints = [
    ...Array.from({ length: 0x2ff + 1 }, (_, i) => i),
    0x4e2d, // 中 — CJK
    0x00e9, // é — Latin Extended-A
    0x1f600, // 😀 — emoji (surrogate pair in JS; str.length === 2)
  ];

  const acceptedByAuth = new Set<string>();
  const acceptedBySafe = new Set<string>();

  beforeAll(() => {
    for (const cp of sampleCodePoints) {
      // String.fromCodePoint handles surrogate pairs, unlike String.fromCharCode
      const ch = String.fromCodePoint(cp);
      if (AUTHORABLE_SNAKE_KEY.test(ch)) acceptedByAuth.add(ch);
      if (SAFE_SNAKE_KEY.test(ch)) acceptedBySafe.add(ch);
    }
  });

  it('every key the authoring guard accepts is also accepted by the read guard', () => {
    // AUTHORABLE_SNAKE_KEY ⊆ SAFE_SNAKE_KEY — breaking this would let authors create
    // keys the reader then rejects, silently dropping those fields from analytics.
    for (const ch of acceptedByAuth) {
      expect(SAFE_SNAKE_KEY.test(ch)).toBe(true);
    }
  });

  it('a hyphen is accepted by the read guard but rejected by the authoring guard', () => {
    // This is the single-sentence behavioural contract of the split. Pin it so the intent
    // survives future refactors: if someone moves `-` into AUTHORABLE_KEY_CHARS, this test
    // fails and they have to make that an intentional decision.
    expect(SAFE_SNAKE_KEY.test('-')).toBe(true);
    expect(AUTHORABLE_SNAKE_KEY.test('-')).toBe(false);
  });

  it('the delta between the read guard and the authoring guard is exactly the intended tolerated set', () => {
    // Characters accepted by SAFE_SNAKE_KEY but not by AUTHORABLE_SNAKE_KEY should be exactly
    // the characters in READ_TOLERATED_KEY_CHARS — currently just hyphens. If this test fails,
    // either the delta grew (a new character was added to SAFE_SNAKE_KEY only) or shrank
    // (a character was removed from SAFE_SNAKE_KEY, making some stored keys unreadable).
    const delta = [...acceptedBySafe].filter((ch) => !acceptedByAuth.has(ch)).sort();
    // Update this list if READ_TOLERATED_KEY_CHARS is intentionally changed.
    expect(delta).toEqual(['-']);
  });

  it('both guards share the same length cap via their wrapper helpers', () => {
    const exactLen = 'a'.repeat(MAX_SNAKE_KEY_LENGTH);
    const overLen = 'a'.repeat(MAX_SNAKE_KEY_LENGTH + 1);

    expect(isSafeExtendedFieldKey(exactLen)).toBe(true);
    expect(isSafeExtendedFieldKey(overLen)).toBe(false);

    expect(isAuthorableExtendedFieldKey(exactLen)).toBe(true);
    expect(isAuthorableExtendedFieldKey(overLen)).toBe(false);
  });

  it('empty string is rejected by both guards', () => {
    expect(isSafeExtendedFieldKey('')).toBe(false);
    expect(isAuthorableExtendedFieldKey('')).toBe(false);
  });
});

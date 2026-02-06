/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripPlaceholderTokensWithCount, isPatternExcludable } from './discover_message_patterns';

describe('stripPlaceholderTokensWithCount', () => {
  it('returns the original pattern and zero count when no placeholders are present', () => {
    const result = stripPlaceholderTokensWithCount('GET request completed successfully');
    expect(result).toEqual({ cleaned: 'GET request completed successfully', placeholderCount: 0 });
  });

  it('strips __URL__ placeholder and counts it', () => {
    const result = stripPlaceholderTokensWithCount('GET __URL__ HTTP completed');
    expect(result).toEqual({ cleaned: 'GET HTTP completed', placeholderCount: 1 });
  });

  it('strips URL__ form (leading underscores stripped by tokenizer)', () => {
    const result = stripPlaceholderTokensWithCount('GET URL__ HTTP completed');
    expect(result).toEqual({ cleaned: 'GET HTTP completed', placeholderCount: 1 });
  });

  it('strips __URL form (trailing underscores stripped by tokenizer)', () => {
    const result = stripPlaceholderTokensWithCount('GET __URL HTTP completed');
    expect(result).toEqual({ cleaned: 'GET HTTP completed', placeholderCount: 1 });
  });

  it('strips bare URL form (all underscores stripped by tokenizer)', () => {
    const result = stripPlaceholderTokensWithCount('GET URL HTTP completed');
    expect(result).toEqual({ cleaned: 'GET HTTP completed', placeholderCount: 1 });
  });

  it('strips multiple different placeholders and counts each', () => {
    const result = stripPlaceholderTokensWithCount('GET __URL__ HTTP __NUM__ __IP__ response');
    expect(result).toEqual({ cleaned: 'GET HTTP response', placeholderCount: 3 });
  });

  it('strips consecutive placeholders', () => {
    const result = stripPlaceholderTokensWithCount('__UUID__ __TIMESTAMP__ started');
    expect(result).toEqual({ cleaned: 'started', placeholderCount: 2 });
  });

  it('strips __HTTPMETHOD__ placeholder and counts it', () => {
    const result = stripPlaceholderTokensWithCount('__HTTPMETHOD__ /api/status HTTP completed');
    expect(result).toEqual({
      cleaned: '/api/status HTTP completed',
      placeholderCount: 1,
    });
  });

  it('strips all placeholder types', () => {
    const result = stripPlaceholderTokensWithCount(
      '__URL__ __ID__ __IP__ __UUID__ __EMAIL__ __TIMESTAMP__ __NUM__ __HTTPMETHOD__'
    );
    expect(result).toEqual({ cleaned: '', placeholderCount: 8 });
  });

  it('collapses multiple spaces after stripping', () => {
    const result = stripPlaceholderTokensWithCount('start  __URL__  __NUM__  end');
    expect(result).toEqual({ cleaned: 'start end', placeholderCount: 2 });
  });

  it('trims leading and trailing whitespace', () => {
    const result = stripPlaceholderTokensWithCount('  __URL__ some pattern __NUM__  ');
    expect(result).toEqual({ cleaned: 'some pattern', placeholderCount: 2 });
  });

  it('handles an empty string', () => {
    const result = stripPlaceholderTokensWithCount('');
    expect(result).toEqual({ cleaned: '', placeholderCount: 0 });
  });

  it('handles patterns that are only whitespace', () => {
    const result = stripPlaceholderTokensWithCount('   ');
    expect(result).toEqual({ cleaned: '', placeholderCount: 0 });
  });
});

describe('isPatternExcludable', () => {
  it('returns true for patterns with 3 or more meaningful tokens', () => {
    expect(isPatternExcludable('connection closed for user')).toBe(true);
  });

  it('returns false for patterns with fewer than 3 meaningful tokens', () => {
    expect(isPatternExcludable('request sent')).toBe(false);
  });

  it('returns false for single-token patterns', () => {
    expect(isPatternExcludable('error')).toBe(false);
  });

  it('returns false for empty patterns', () => {
    expect(isPatternExcludable('')).toBe(false);
  });

  it('returns false for patterns that are only placeholders', () => {
    expect(isPatternExcludable('__URL__ __NUM__ __IP__')).toBe(false);
  });

  it('counts tokens after placeholder removal', () => {
    // "GET __URL__ HTTP __NUM__ OK" → cleaned: "GET HTTP OK" → 3 tokens → true
    expect(isPatternExcludable('GET __URL__ HTTP __NUM__ OK')).toBe(true);
  });

  it('returns false when placeholders reduce tokens below minimum', () => {
    // "sent __URL__ to" → cleaned: "sent to" → 2 tokens → false
    expect(isPatternExcludable('sent __URL__ to')).toBe(false);
  });

  it('returns true at exactly the minimum threshold', () => {
    expect(isPatternExcludable('one two three')).toBe(true);
  });

  it('returns false just below the minimum threshold', () => {
    expect(isPatternExcludable('one two')).toBe(false);
  });
});

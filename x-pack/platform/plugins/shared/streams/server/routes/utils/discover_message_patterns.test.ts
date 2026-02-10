/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripPlaceholderTokens, isMeaningfulPattern } from './discover_message_patterns';

describe('stripPlaceholderTokens', () => {
  it('returns the original pattern when no placeholders are present', () => {
    expect(stripPlaceholderTokens('GET request completed successfully')).toBe(
      'GET request completed successfully'
    );
  });

  it('strips __URL__ placeholder', () => {
    expect(stripPlaceholderTokens('GET __URL__ HTTP completed')).toBe('GET HTTP completed');
  });

  it('strips URL__ form (leading underscores stripped by tokenizer)', () => {
    expect(stripPlaceholderTokens('GET URL__ HTTP completed')).toBe('GET HTTP completed');
  });

  it('strips __URL form (trailing underscores stripped by tokenizer)', () => {
    expect(stripPlaceholderTokens('GET __URL HTTP completed')).toBe('GET HTTP completed');
  });

  it('strips bare URL form (all underscores stripped by tokenizer)', () => {
    expect(stripPlaceholderTokens('GET URL HTTP completed')).toBe('GET HTTP completed');
  });

  it('strips multiple different placeholders', () => {
    expect(stripPlaceholderTokens('GET __URL__ HTTP __NUM__ __IP__ response')).toBe(
      'GET HTTP response'
    );
  });

  it('strips consecutive placeholders', () => {
    expect(stripPlaceholderTokens('__UUID__ __TIMESTAMP__ started')).toBe('started');
  });

  it('strips __HTTPMETHOD__ placeholder', () => {
    expect(stripPlaceholderTokens('__HTTPMETHOD__ /api/status HTTP completed')).toBe(
      '/api/status HTTP completed'
    );
  });

  it('strips all placeholder types', () => {
    expect(
      stripPlaceholderTokens(
        '__URL__ __ID__ __IP__ __UUID__ __EMAIL__ __TIMESTAMP__ __NUM__ __HTTPMETHOD__'
      )
    ).toBe('');
  });

  it('collapses multiple spaces after stripping', () => {
    expect(stripPlaceholderTokens('start  __URL__  __NUM__  end')).toBe('start end');
  });

  it('trims leading and trailing whitespace', () => {
    expect(stripPlaceholderTokens('  __URL__ some pattern __NUM__  ')).toBe('some pattern');
  });

  it('handles an empty string', () => {
    expect(stripPlaceholderTokens('')).toBe('');
  });

  it('handles patterns that are only whitespace', () => {
    expect(stripPlaceholderTokens('   ')).toBe('');
  });
});

describe('isMeaningfulPattern', () => {
  it('returns true for patterns with 3 or more meaningful tokens', () => {
    expect(isMeaningfulPattern('connection closed for user')).toBe(true);
  });

  it('returns false for patterns with fewer than 3 meaningful tokens', () => {
    expect(isMeaningfulPattern('request sent')).toBe(false);
  });

  it('returns false for single-token patterns', () => {
    expect(isMeaningfulPattern('error')).toBe(false);
  });

  it('returns false for empty patterns', () => {
    expect(isMeaningfulPattern('')).toBe(false);
  });

  it('returns false for patterns that are only placeholders', () => {
    expect(isMeaningfulPattern('__URL__ __NUM__ __IP__')).toBe(false);
  });

  it('counts tokens after placeholder removal', () => {
    // "GET __URL__ HTTP __NUM__ OK" → cleaned: "GET HTTP OK" → 3 tokens → true
    expect(isMeaningfulPattern('GET __URL__ HTTP __NUM__ OK')).toBe(true);
  });

  it('returns false when placeholders reduce tokens below minimum', () => {
    // "sent __URL__ to" → cleaned: "sent to" → 2 tokens → false
    expect(isMeaningfulPattern('sent __URL__ to')).toBe(false);
  });

  it('returns true at exactly the minimum threshold', () => {
    expect(isMeaningfulPattern('one two three')).toBe(true);
  });

  it('returns false just below the minimum threshold', () => {
    expect(isMeaningfulPattern('one two')).toBe(false);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { generateSampleForPattern, toExampleFieldKey } from './generate_pattern_example';

describe('generateSampleForPattern', () => {
  it('generates a value matching a simple literal-prefix identifier pattern', () => {
    const sample = generateSampleForPattern('EMP-\\d+');

    expect(sample).toBeDefined();
    expect(sample).toMatch(/EMP-\d+/);
  });

  it('generates a value matching bounded quantifiers on a character class and a digit class', () => {
    const sample = generateSampleForPattern('[A-Z]{3}-\\d{4,6}');

    expect(sample).toBeDefined();
    expect(sample).toMatch(/^[A-Z]{3}-\d{4,6}$/);
  });

  it('generates a value matching an anchored pattern', () => {
    const sample = generateSampleForPattern('^CASE-[0-9]{6}$');

    expect(sample).toBeDefined();
    expect(sample).toMatch(/^CASE-[0-9]{6}$/);
  });

  it('generates a value matching a non-capturing group with a quantifier applied to the group', () => {
    const sample = generateSampleForPattern('(?:AB){2}\\d{3}');

    expect(sample).toBeDefined();
    expect(sample).toMatch(/^(?:AB){2}\d{3}$/);
  });

  it('generates a value matching the first alternative of a top-level alternation', () => {
    const sample = generateSampleForPattern('BADGE-\\d{4}|VISITOR-\\d{4}');

    expect(sample).toMatch(/^BADGE-\d{4}$/);
  });

  it('generates a value matching an escaped literal metacharacter', () => {
    const sample = generateSampleForPattern('v\\d+\\.\\d+\\.\\d+');

    expect(sample).toBeDefined();
    expect(sample).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it('generates a value matching a word-character class', () => {
    const sample = generateSampleForPattern('ACC_[\\w]{5}');

    expect(sample).toBeDefined();
    expect(sample).toMatch(/^ACC_[\w]{5}$/);
  });

  it('returns undefined for an empty or whitespace-only pattern', () => {
    expect(generateSampleForPattern('')).toBeUndefined();
    expect(generateSampleForPattern('   ')).toBeUndefined();
  });

  it('returns undefined for patterns using unsupported lookahead assertions', () => {
    expect(generateSampleForPattern('EMP(?=-\\d+)')).toBeUndefined();
  });

  it('returns undefined for patterns using unsupported lookbehind assertions', () => {
    expect(generateSampleForPattern('(?<=EMP-)\\d+')).toBeUndefined();
  });

  it('returns undefined for patterns using unsupported negated character classes', () => {
    expect(generateSampleForPattern('[^0-9]+')).toBeUndefined();
  });

  it('returns undefined for patterns using unsupported backreferences', () => {
    expect(generateSampleForPattern('(EMP)-\\1')).toBeUndefined();
  });

  it('returns undefined for an invalid/unbalanced regex', () => {
    expect(generateSampleForPattern('EMP-(\\d+')).toBeUndefined();
  });

  it('returns undefined rather than a wrong value when an exact count exceeds the repeat cap', () => {
    // The generator caps repeats well below 50, so it cannot produce a value satisfying an exact
    // `{50}` and refuses, instead of returning a string that looks plausible but doesn't match.
    expect(generateSampleForPattern('\\d{50}')).toBeUndefined();
    expect(generateSampleForPattern('[A-Z]{20,30}')).toBeUndefined();
    expect(generateSampleForPattern('\\d{20,}')).toBeUndefined();
  });

  it('caps unbounded-minimum repeats so the example stays short', () => {
    const sample = generateSampleForPattern('\\d{1,1000}');

    expect(sample).toBeDefined();
    expect(sample!.length).toBeLessThanOrEqual(60);
    expect(sample).toMatch(/^\d{1,1000}$/);
  });

  it('skips later alternatives inside a nested group and keeps parsing after it', () => {
    expect(generateSampleForPattern('ID-(?:AB|(?:CD|EF))-\\d{2}')).toMatch(/^ID-AB-\d{2}$/);
  });

  it('supports named groups, lazy quantifiers and whitespace escapes', () => {
    expect(generateSampleForPattern('(?<prefix>TK)\\s\\d+?')).toMatch(/^TK \d+$/);
  });

  it('returns undefined when the generated value would exceed the length cap', () => {
    expect(generateSampleForPattern('(?:[A-Z]{12}-){6}')).toBeUndefined();
  });
});

describe('toExampleFieldKey', () => {
  it('snake_cases a pattern name', () => {
    expect(toExampleFieldKey('  Employee ID (EU) ')).toBe('employee_id_eu');
  });

  it('falls back to "value" when nothing usable remains', () => {
    expect(toExampleFieldKey('')).toBe('value');
    expect(toExampleFieldKey('åäö')).toBe('value');
  });

  it('never builds or runs the pattern as a regex, which could freeze the page while typing', () => {
    // Executing a pattern like `^(a+){12}$` against its own sample backtracks exponentially.
    const RegExpSpy = jest.spyOn(global, 'RegExp');
    try {
      generateSampleForPattern('EMP-\\d+');
      generateSampleForPattern('^(a+){12}$');

      expect(RegExpSpy).not.toHaveBeenCalled();
    } finally {
      RegExpSpy.mockRestore();
    }
  });

  it.each([
    ['a negated-word class escape', '[\\W]{3}'],
    ['a negated-digit class escape', '[\\D]'],
    ['a negated-space class escape', '[\\S]{2}'],
    ['a newline class escape', '[\\n]'],
    ['a tab class escape', '[\\t]{2}'],
    ['a hex class escape', '[\\x41]'],
    ['a non-word-boundary assertion', '\\Bfoo'],
  ])(
    'returns undefined for %s, which it would otherwise expand to a value that does not match',
    (_, pattern) => {
      expect(generateSampleForPattern(pattern)).toBeUndefined();
    }
  );

  // Nothing checks a sample against the user's pattern at runtime (see the module doc), so this
  // is what guarantees that whatever the generator returns really matches.
  it.each([
    'EMP-\\d+',
    '[A-Z]{3}-\\d{4,6}',
    '^CASE-[0-9]{6}$',
    '\\bEMP-\\d{3}\\b',
    '(?:ab|cd){2}',
    '[\\w.-]+@[a-z]+\\.com',
    'user_[a-f0-9]{8}',
    '\\d{3}-\\d{2}-\\d{4}',
    '[A-Za-z]+\\s[A-Za-z]+',
    '(?<id>[A-Z]{2}\\d{4})',
    'a{0,5}b',
    'x?y*z+',
    '\\D\\W\\S',
    '[\\d\\W]{3}',
    '[ -~]{4}',
    '[\\.\\-]{2}',
    '[b-d]{3}',
  ])('only returns a value that matches the pattern: %s', (pattern) => {
    const sample = generateSampleForPattern(pattern);

    expect(sample).toBeDefined();
    expect(new RegExp(pattern).test(sample as string)).toBe(true);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRegexPatternError } from './get_regex_pattern_error';

describe('getRegexPatternError', () => {
  it.each(['EMP-\\d+', '[A-Z]{3}-\\d{4,6}', '(?:AB|CD)\\d'])('accepts %s', (pattern) => {
    expect(getRegexPatternError(pattern)).toBeUndefined();
  });

  // Accepted by the browser's RegExp but not by the engine that runs custom rules.
  it.each(['foo(?=bar)', '(?<=@)\\w+', '(a)\\1', '\\u00e9'])(
    'rejects %s, which only native RegExp supports',
    (pattern) => {
      expect(getRegexPatternError(pattern)).toEqual(expect.any(String));
    }
  );

  it.each(['(?i)secret', '\\p{L}+@corp', '\\x{00e9}'])(
    'accepts %s, which RE2 supports',
    (pattern) => {
      expect(getRegexPatternError(pattern)).toBeUndefined();
    }
  );

  it.each(['(unclosed', '[a-', '*start', 'a{2,1}'])(
    'explains why %s does not compile',
    (pattern) => {
      expect(getRegexPatternError(pattern)).toEqual(expect.any(String));
    }
  );
});

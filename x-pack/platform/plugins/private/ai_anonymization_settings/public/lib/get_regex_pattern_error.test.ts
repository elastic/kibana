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

  it.each(['(unclosed', '[a-', '*start', 'a{2,1}'])(
    'explains why %s does not compile',
    (pattern) => {
      expect(getRegexPatternError(pattern)).toEqual(expect.any(String));
    }
  );
});

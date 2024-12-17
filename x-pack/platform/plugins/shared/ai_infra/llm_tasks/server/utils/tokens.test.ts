/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { count, truncate } from './tokens';

describe('count', () => {
  it('returns the token count of a given text', () => {
    expect(count('some short sentence')).toBeGreaterThan(1);
  });
});

describe('truncate', () => {
  it('truncates text that exceed the specified maximum token count', () => {
    const text = 'some sentence that is likely longer than 5 tokens.';
    const output = truncate(text, 5);
    expect(output.length).toBeLessThan(text.length);
  });
  it('keeps text with a smaller amount of tokens unchanged', () => {
    const text = 'some sentence that is likely less than 100 tokens.';
    const output = truncate(text, 100);
    expect(output.length).toEqual(text.length);
  });
});

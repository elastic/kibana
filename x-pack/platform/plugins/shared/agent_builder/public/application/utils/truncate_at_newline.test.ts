/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncateAtNewline } from './truncate_at_newline';

describe('truncateAtNewline', () => {
  it('should truncate a string at the first newline character', () => {
    const input = 'Hello\nWorld';
    const expected = 'Hello';
    expect(truncateAtNewline(input)).toBe(expected);
  });

  it('should return the original string if no newline character is present', () => {
    const input = 'Hello World';
    expect(truncateAtNewline(input)).toBe(input);
  });

  it('should handle strings with multiple newline characters', () => {
    const input = 'Hello\nWorld\nAgain';
    const expected = 'Hello';
    expect(truncateAtNewline(input)).toBe(expected);
  });

  it('should handle an empty string', () => {
    const input = '';
    expect(truncateAtNewline(input)).toBe('');
  });

  it('should handle a string that starts with a newline', () => {
    const input = '\nHelloWorld';
    expect(truncateAtNewline(input)).toBe('');
  });

  it('should handle a string with only a newline character', () => {
    const input = '\n';
    expect(truncateAtNewline(input)).toBe('');
  });
});

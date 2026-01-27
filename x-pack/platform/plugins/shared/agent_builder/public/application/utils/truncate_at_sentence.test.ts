/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncateAtSentence } from './truncate_at_sentence';

describe('truncateAtSentence', () => {
  it('should truncate at the first period', () => {
    const input = 'This is the first sentence. This is the second sentence.';
    const expected = 'This is the first sentence.';
    expect(truncateAtSentence(input)).toBe(expected);
  });

  it('should truncate at the first exclamation mark', () => {
    const input = 'Hello world! This is more text.';
    const expected = 'Hello world!';
    expect(truncateAtSentence(input)).toBe(expected);
  });

  it('should truncate at the first question mark', () => {
    const input = 'What is this? Let me explain.';
    const expected = 'What is this?';
    expect(truncateAtSentence(input)).toBe(expected);
  });

  it('should return the original string if no sentence-ending punctuation is present', () => {
    const input = 'This string has no ending punctuation';
    expect(truncateAtSentence(input)).toBe(input);
  });

  it('should return undefined for undefined input', () => {
    expect(truncateAtSentence(undefined)).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    expect(truncateAtSentence('')).toBeUndefined();
  });

  it('should handle a string that starts with punctuation', () => {
    const input = '.Hello World';
    expect(truncateAtSentence(input)).toBe('.');
  });

  it('should handle a string with only punctuation', () => {
    expect(truncateAtSentence('.')).toBe('.');
    expect(truncateAtSentence('!')).toBe('!');
    expect(truncateAtSentence('?')).toBe('?');
  });

  it('should handle multiple punctuation types and return at the first one', () => {
    const input = 'Is this a question! No, it ends with exclamation.';
    const expected = 'Is this a question!';
    expect(truncateAtSentence(input)).toBe(expected);
  });
});

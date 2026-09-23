/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncateMessage } from './truncate_message';

describe('truncateMessage', () => {
  it('returns the original message when it is shorter than maxLength', () => {
    expect(truncateMessage('hello', 130)).toEqual({
      originalLength: 5,
      truncated: false,
      value: 'hello',
    });
  });

  it('returns the original message when it is equal to maxLength', () => {
    const message = 'a'.repeat(130);
    expect(truncateMessage(message, 130)).toEqual({
      originalLength: 130,
      truncated: false,
      value: message,
    });
  });

  it('truncates to maxLength unicode characters when the message is longer', () => {
    expect(truncateMessage('a'.repeat(131), 130)).toEqual({
      originalLength: 131,
      truncated: true,
      value: 'a'.repeat(130),
    });
  });

  it('does not split a surrogate pair at the cut', () => {
    const message = `${'a'.repeat(129)}\u{1F600}`;
    expect(truncateMessage(message, 130)).toEqual({
      originalLength: 130,
      truncated: false,
      value: message,
    });
  });

  it('returns a short message unchanged, including surrounding whitespace', () => {
    expect(truncateMessage('  alert  ', 130)).toEqual({
      originalLength: 9,
      truncated: false,
      value: '  alert  ',
    });
  });

  it('preserves the original prefix when truncating an over-limit message', () => {
    const message = `\n${'a'.repeat(130)}`;
    expect(truncateMessage(message, 130)).toEqual({
      originalLength: 131,
      truncated: true,
      value: `\n${'a'.repeat(129)}`,
    });
  });

  it('does not shift later characters into the payload by trimming first', () => {
    expect(truncateMessage(`${' '.repeat(10)}${'a'.repeat(131)}`, 130)).toEqual({
      originalLength: 141,
      truncated: true,
      value: `${' '.repeat(10)}${'a'.repeat(120)}`,
    });
  });
});

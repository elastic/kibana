/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SANITIZED_ERROR_MESSAGE_LENGTH, sanitizeErrorMessage } from './sanitize_error_message';

describe('sanitizeErrorMessage', () => {
  it('returns a message without quotes unchanged', () => {
    expect(sanitizeErrorMessage('Status code: 429. Message: Too Many Requests')).toBe(
      'Status code: 429. Message: Too Many Requests'
    );
  });

  it('cuts the message at the first double quote and trims it', () => {
    const message =
      'Failed to parse line "data: {"choices":[{"delta":{"content":"MODEL-OUTPUT-MARKER"}}]}": Unexpected token';

    expect(sanitizeErrorMessage(message)).toBe('Failed to parse line');
  });

  it('bounds a long message that has no quotes', () => {
    expect(sanitizeErrorMessage('x'.repeat(MAX_SANITIZED_ERROR_MESSAGE_LENGTH + 50))).toHaveLength(
      MAX_SANITIZED_ERROR_MESSAGE_LENGTH
    );
  });
});

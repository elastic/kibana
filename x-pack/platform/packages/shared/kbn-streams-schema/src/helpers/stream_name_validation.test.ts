/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  validateStreamName,
  MAX_STREAM_NAME_LENGTH,
  INVALID_STREAM_NAME_CHARACTERS,
} from './stream_name_validation';

describe('validateStreamName', () => {
  it('returns valid for a valid stream name', () => {
    expect(validateStreamName('logs')).toEqual({ valid: true });
    expect(validateStreamName('logs.nginx')).toEqual({ valid: true });
    expect(validateStreamName('my-stream-name')).toEqual({ valid: true });
    expect(validateStreamName('logs_2024')).toEqual({ valid: true });
  });

  it('returns invalid for empty name', () => {
    expect(validateStreamName('')).toEqual({
      valid: false,
      message: 'Stream name must not be empty.',
    });
  });

  it('returns invalid for name exceeding max length', () => {
    const longName = 'a'.repeat(MAX_STREAM_NAME_LENGTH + 1);
    expect(validateStreamName(longName)).toEqual({
      valid: false,
      message: `Stream name cannot be longer than ${MAX_STREAM_NAME_LENGTH} characters.`,
    });
  });

  it('returns valid for name at max length', () => {
    const maxLengthName = 'a'.repeat(MAX_STREAM_NAME_LENGTH);
    expect(validateStreamName(maxLengthName)).toEqual({ valid: true });
  });

  it('returns invalid for uppercase characters', () => {
    expect(validateStreamName('Logs')).toEqual({
      valid: false,
      message: 'Stream name cannot contain uppercase characters.',
    });
    expect(validateStreamName('LOGS')).toEqual({
      valid: false,
      message: 'Stream name cannot contain uppercase characters.',
    });
    expect(validateStreamName('loGs')).toEqual({
      valid: false,
      message: 'Stream name cannot contain uppercase characters.',
    });
  });

  it('returns invalid for space character', () => {
    expect(validateStreamName('my stream')).toEqual({
      valid: false,
      message: 'Stream name cannot contain spaces.',
    });
  });

  describe('invalid characters', () => {
    const testCases = [
      { char: '"', display: '"\\""' },
      { char: '\\', display: '"\\\\"' },
      { char: '*', display: '"*"' },
      { char: ',', display: '","' },
      { char: '/', display: '"/"' },
      { char: '<', display: '"<"' },
      { char: '>', display: '">"' },
      { char: '?', display: '"?"' },
      { char: '|', display: '"|"' },
    ];

    testCases.forEach(({ char, display }) => {
      it(`returns invalid for "${char}" character`, () => {
        const result = validateStreamName(`logs${char}nginx`);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.message).toContain('Stream name cannot contain');
        }
      });
    });
  });

  it('exports the correct invalid characters list', () => {
    expect(INVALID_STREAM_NAME_CHARACTERS).toEqual([
      ' ',
      '"',
      '\\',
      '*',
      ',',
      '/',
      '<',
      '>',
      '?',
      '|',
    ]);
  });

  it('exports the correct max length', () => {
    expect(MAX_STREAM_NAME_LENGTH).toBe(200);
  });
});

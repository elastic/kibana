/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTextInputHardMaxLength, validateTextInput } from './validate_text_input';

const MAX_LENGTH = 100;

describe('getTextInputHardMaxLength', () => {
  it('defaults to twice the max length', () => {
    expect(getTextInputHardMaxLength(MAX_LENGTH)).toBe(200);
  });
});

describe('validateTextInput', () => {
  it('returns valid with no message for a short value', () => {
    expect(validateTextInput({ value: 'Support tickets', maxLength: MAX_LENGTH })).toEqual({
      valid: true,
    });
  });

  it('returns valid with no message just under the warning threshold', () => {
    const value = 'a'.repeat(Math.floor(MAX_LENGTH * 0.95) - 1);

    expect(validateTextInput({ value, maxLength: MAX_LENGTH })).toEqual({ valid: true });
  });

  it('returns a warning once within 5% of the max length', () => {
    const value = 'a'.repeat(Math.ceil(MAX_LENGTH * 0.95) + 1);

    const result = validateTextInput({ value, maxLength: MAX_LENGTH });
    expect(result).toEqual({ valid: true, warning: expect.stringContaining('4') });
  });

  it('returns a warning (no error) exactly at the max length', () => {
    const value = 'a'.repeat(MAX_LENGTH);

    const result = validateTextInput({ value, maxLength: MAX_LENGTH });
    expect(result).toEqual({ valid: true, warning: expect.stringContaining('0') });
  });

  it('returns invalid once over the max length', () => {
    const value = 'a'.repeat(MAX_LENGTH + 5);

    const result = validateTextInput({ value, maxLength: MAX_LENGTH });
    expect(result).toEqual({ valid: false, error: expect.stringContaining('5') });
  });
});

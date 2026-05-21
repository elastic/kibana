/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_NAME_TRUNCATE_LENGTH, truncateMiddle } from './truncate';

describe('truncateMiddle', () => {
  it('returns the input unchanged when shorter than the budget', () => {
    expect(truncateMiddle('host.name', 32)).toBe('host.name');
  });

  it('returns the input unchanged when exactly at the budget', () => {
    const exact = 'a'.repeat(32);
    expect(truncateMiddle(exact, 32)).toBe(exact);
  });

  it('truncates with an ellipsis and never exceeds the budget', () => {
    const truncated = truncateMiddle('a'.repeat(64), 10);
    expect(truncated).toBe(`${'a'.repeat(9)}…`);
    expect(truncated.length).toBe(10);
  });

  it('falls back to a plain prefix slice when the budget is too small for the ellipsis', () => {
    // With maxLength 1 there's no room for both a character and an
    // ellipsis, so we'd rather show a single character than nothing.
    expect(truncateMiddle('abcdef', 1)).toBe('a');
  });

  it('returns empty string for empty input', () => {
    expect(truncateMiddle('', 5)).toBe('');
  });

  it('uses the default field-name budget when none is provided', () => {
    const longField = 'a'.repeat(FIELD_NAME_TRUNCATE_LENGTH + 10);
    const truncated = truncateMiddle(longField);
    expect(truncated.length).toBe(FIELD_NAME_TRUNCATE_LENGTH);
    expect(truncated.endsWith('…')).toBe(true);
  });
});

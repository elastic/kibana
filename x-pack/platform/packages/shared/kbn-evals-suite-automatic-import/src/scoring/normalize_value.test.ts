/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeValue } from './normalize_value';

describe('normalizeValue', () => {
  it('treats numbers and numeric strings as equal', () => {
    expect(normalizeValue('443')).toBe(normalizeValue(443));
    expect(normalizeValue('1.50')).toBe(normalizeValue(1.5));
  });

  it('compares timestamps as instants, ignoring extra precision and offsets', () => {
    expect(normalizeValue('2026-02-07T15:15:44.004076068Z')).toBe(
      normalizeValue('2026-02-07T15:15:44.004Z')
    );
    expect(normalizeValue('2024-01-04T06:26:20+02:00')).toBe(
      normalizeValue('2024-01-04T04:26:20.000Z')
    );
  });

  it('reads timestamps without a zone as UTC, whatever the machine time zone', () => {
    expect(normalizeValue('2024-01-04 06:26:20')).toBe('2024-01-04T06:26:20.000Z');
    expect(normalizeValue('2024-01-04T06:26')).toBe('2024-01-04T06:26:00.000Z');
    expect(normalizeValue('2024-01-04 06:26:20 UTC')).toBe('2024-01-04T06:26:20.000Z');
    expect(normalizeValue('2024-01-04T06:26:20-0500')).toBe('2024-01-04T11:26:20.000Z');
  });

  it('compares IPv6 addresses in canonical form', () => {
    expect(normalizeValue('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe(
      normalizeValue('2001:db8::1')
    );
  });

  it('ignores array order and treats a single-element array as its value', () => {
    expect(normalizeValue(['b', 'a'])).toBe(normalizeValue(['a', 'b']));
    expect(normalizeValue(['allowed'])).toBe(normalizeValue('allowed'));
  });

  it('keeps different strings different', () => {
    expect(normalizeValue('Allowed')).not.toBe(normalizeValue('allowed'));
  });
});

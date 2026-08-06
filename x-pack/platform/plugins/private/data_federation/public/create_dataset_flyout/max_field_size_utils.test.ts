/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bytesToDisplayValue,
  displayValueToBytes,
  getMaxFieldSizeDisplayState,
  parseStoredMaxFieldSizeBytes,
  pickBestByteSizeUnit,
} from './max_field_size_utils';

describe('max_field_size_utils', () => {
  it('parses stored byte values', () => {
    expect(parseStoredMaxFieldSizeBytes('10485760')).toBe(10485760);
    expect(parseStoredMaxFieldSizeBytes('0')).toBe(0);
    expect(parseStoredMaxFieldSizeBytes('')).toBeUndefined();
    expect(parseStoredMaxFieldSizeBytes('-1')).toBeUndefined();
  });

  it('converts between display values and bytes', () => {
    expect(displayValueToBytes(10, 'mb')).toBe(10485760);
    expect(bytesToDisplayValue(10485760, 'mb')).toBe(10);
    expect(displayValueToBytes(1, 'gb')).toBe(1073741824);
  });

  it('picks a readable unit for stored bytes', () => {
    expect(pickBestByteSizeUnit(10485760)).toBe('mb');
    expect(pickBestByteSizeUnit(512)).toBe('b');
    expect(pickBestByteSizeUnit(0)).toBe('mb');
  });

  it('derives display state from stored bytes', () => {
    expect(getMaxFieldSizeDisplayState('10485760')).toEqual({
      displayValue: '10',
      unit: 'mb',
    });
    expect(getMaxFieldSizeDisplayState('')).toEqual({
      displayValue: '',
      unit: 'mb',
    });
  });
});

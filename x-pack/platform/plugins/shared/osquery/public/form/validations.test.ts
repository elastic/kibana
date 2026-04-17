/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QUERY_TIMEOUT } from '../../common/constants';
import { validateTimeout } from './validations';

describe('validateTimeout', () => {
  it('should accept the minimum valid value (DEFAULT)', () => {
    expect(validateTimeout(QUERY_TIMEOUT.DEFAULT)).toBeUndefined();
  });

  it('should accept the maximum valid value (MAX)', () => {
    expect(validateTimeout(QUERY_TIMEOUT.MAX)).toBeUndefined();
  });

  it('should accept a value within range', () => {
    const mid = Math.floor((QUERY_TIMEOUT.DEFAULT + QUERY_TIMEOUT.MAX) / 2);
    expect(validateTimeout(mid)).toBeUndefined();
  });

  it('should reject a value above MAX', () => {
    const result = validateTimeout(QUERY_TIMEOUT.MAX + 1);
    expect(result).toBeDefined();
    expect(result).toContain(String(QUERY_TIMEOUT.MAX));
  });

  it('should reject a value below DEFAULT', () => {
    const result = validateTimeout(QUERY_TIMEOUT.DEFAULT - 1);
    expect(result).toBeDefined();
    expect(result).toContain(String(QUERY_TIMEOUT.DEFAULT));
  });

  it('should reject zero', () => {
    expect(validateTimeout(0)).toBeDefined();
  });

  it('should reject negative values', () => {
    expect(validateTimeout(-1)).toBeDefined();
  });

  it('should reject NaN', () => {
    expect(validateTimeout(NaN)).toBeDefined();
  });
});

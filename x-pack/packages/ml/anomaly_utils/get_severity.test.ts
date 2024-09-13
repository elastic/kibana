/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSeverity } from './get_severity';

describe('getSeverity', () => {
  test('returns warning for 0 <= score < 25', () => {
    expect(getSeverity(0).id).toBe('warning');
    expect(getSeverity(0.001).id).toBe('warning');
    expect(getSeverity(24.99).id).toBe('warning');
  });

  test('returns minor for 25 <= score < 50', () => {
    expect(getSeverity(25).id).toBe('minor');
    expect(getSeverity(49.99).id).toBe('minor');
  });

  test('returns minor for 50 <= score < 75', () => {
    expect(getSeverity(50).id).toBe('major');
    expect(getSeverity(74.99).id).toBe('major');
  });

  test('returns critical for score >= 75', () => {
    expect(getSeverity(75).id).toBe('critical');
    expect(getSeverity(100).id).toBe('critical');
    expect(getSeverity(1000).id).toBe('critical');
  });

  test('returns unknown for scores less than 0', () => {
    expect(getSeverity(-10).id).toBe('unknown');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSeverityColor } from './get_severity_color';
import { ML_SEVERITY_COLORS } from './severity_colors';

describe('getSeverityColor', () => {
  test('returns correct hex code for low for 0 <= score < 3', () => {
    expect(getSeverityColor(0)).toBe(ML_SEVERITY_COLORS.LOW);
    expect(getSeverityColor(0.001)).toBe(ML_SEVERITY_COLORS.LOW);
    expect(getSeverityColor(2.99)).toBe(ML_SEVERITY_COLORS.LOW);
  });

  test('returns correct hex code for warning for 3 <= score < 25', () => {
    expect(getSeverityColor(3)).toBe(ML_SEVERITY_COLORS.WARNING);
    expect(getSeverityColor(24.99)).toBe(ML_SEVERITY_COLORS.WARNING);
  });

  test('returns correct hex code for minor for 25 <= score < 50', () => {
    expect(getSeverityColor(25)).toBe(ML_SEVERITY_COLORS.MINOR);
    expect(getSeverityColor(49.99)).toBe(ML_SEVERITY_COLORS.MINOR);
  });

  test('returns correct hex code for major for 50 <= score < 75', () => {
    expect(getSeverityColor(50)).toBe(ML_SEVERITY_COLORS.MAJOR);
    expect(getSeverityColor(74.99)).toBe(ML_SEVERITY_COLORS.MAJOR);
  });

  test('returns correct hex code for critical for score >= 75', () => {
    expect(getSeverityColor(75)).toBe(ML_SEVERITY_COLORS.CRITICAL);
    expect(getSeverityColor(100)).toBe(ML_SEVERITY_COLORS.CRITICAL);
    expect(getSeverityColor(1000)).toBe(ML_SEVERITY_COLORS.CRITICAL);
  });

  test('returns correct hex code for unknown for scores less than 0', () => {
    expect(getSeverityColor(-10)).toBe(ML_SEVERITY_COLORS.UNKNOWN);
  });
});

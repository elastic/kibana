/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSeverityColor } from './get_severity_color';

describe('getSeverityColor', () => {
  test('returns correct hex code for low for 0 <= score < 3', () => {
    expect(getSeverityColor(0)).toBe('#d2e9f7');
    expect(getSeverityColor(0.001)).toBe('#d2e9f7');
    expect(getSeverityColor(2.99)).toBe('#d2e9f7');
  });

  test('returns correct hex code for warning for 3 <= score < 25', () => {
    expect(getSeverityColor(3)).toBe('#8bc8fb');
    expect(getSeverityColor(24.99)).toBe('#8bc8fb');
  });

  test('returns correct hex code for minor for 25 <= score < 50', () => {
    expect(getSeverityColor(25)).toBe('#fdec25');
    expect(getSeverityColor(49.99)).toBe('#fdec25');
  });

  test('returns correct hex code for major for 50 <= score < 75', () => {
    expect(getSeverityColor(50)).toBe('#fba740');
    expect(getSeverityColor(74.99)).toBe('#fba740');
  });

  test('returns correct hex code for critical for score >= 75', () => {
    expect(getSeverityColor(75)).toBe('#fe5050');
    expect(getSeverityColor(100)).toBe('#fe5050');
    expect(getSeverityColor(1000)).toBe('#fe5050');
  });

  test('returns correct hex code for unknown for scores less than 0', () => {
    expect(getSeverityColor(-10)).toBe('#ffffff');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatKpiMetricValue } from './kpi_metric_tile';

describe('formatKpiMetricValue', () => {
  it('shows a duration in hours with 1 decimal', () => {
    expect(formatKpiMetricValue(137752, 'duration', 'h')).toBe('38.3 h');
  });

  it('shows a duration in minutes', () => {
    expect(formatKpiMetricValue(5400, 'duration', 'm')).toBe('90 min');
  });

  it('shows a duration in days', () => {
    expect(formatKpiMetricValue(172800, 'duration', 'd')).toBe('2 d');
  });

  it('shows a duration with no unit in the largest unit', () => {
    expect(formatKpiMetricValue(137752, 'duration')).toBe('1d');
  });

  it('ignores the unit for the number format', () => {
    expect(formatKpiMetricValue(5400, 'number', 'h')).toBe(formatKpiMetricValue(5400, 'number'));
  });

  it('shows a dash for no value', () => {
    expect(formatKpiMetricValue(null, 'duration', 'h')).toBe('-');
  });
});

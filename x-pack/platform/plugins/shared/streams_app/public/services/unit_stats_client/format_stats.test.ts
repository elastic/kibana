/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDuration, formatEventsRate, STATS_NO_VALUE_LABEL } from './format_stats';

describe('formatEventsRate', () => {
  it.each<[string, number | null, string]>([
    ['no data shows a dash', null, STATS_NO_VALUE_LABEL],
    ['zero is data', 0, '0/s'],
    ['a tiny rate', 0.004, '<0.01/s'],
    ['just under the smallest shown rate', 0.0099, '<0.01/s'],
    ['the smallest shown rate', 0.01, '0.01/s'],
    ['two decimals below 1', 0.5, '0.50/s'],
    ['rounds up across 1', 0.996, '1.0/s'],
    ['one decimal from 1', 1, '1.0/s'],
    ['one decimal below 10', 3.74, '3.7/s'],
    ['rounds up across 10', 9.96, '10/s'],
    ['whole numbers from 10', 10, '10/s'],
    ['whole numbers below 1000', 42.4, '42/s'],
    ['the largest whole number', 999, '999/s'],
    ['rounds up across 1000', 999.6, '1k/s'],
    ['compact from 1000', 1000, '1k/s'],
    ['compact with a decimal', 3700, '3.7k/s'],
    ['compact above 10k', 12500, '12.5k/s'],
  ])('%s', (_description, value, expected) => {
    expect(formatEventsRate(value)).toBe(expected);
  });
});

describe('formatDuration', () => {
  it.each<[string, number | null, string]>([
    ['no data shows a dash', null, STATS_NO_VALUE_LABEL],
    ['zero is data', 0, '0µs'],
    ['a fraction of a microsecond', 0.0000004, '0.4µs'],
    ['microseconds below 1ms', 0.0004, '400µs'],
    ['milliseconds from 1ms', 0.001, '1ms'],
    ['milliseconds', 0.008, '8ms'],
    ['whole milliseconds from 10ms', 0.0124, '12ms'],
    ['milliseconds below 1s', 0.5, '500ms'],
    ['seconds from 1s', 1, '1s'],
    ['one decimal below 10s', 2.34, '2.3s'],
    ['whole seconds from 10s', 12.4, '12s'],
  ])('%s', (_description, seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TimeRangeOption {
  id: string;
  label: string;
  durationMs: number;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { id: '15m', label: 'Last 15 minutes', durationMs: 15 * MINUTE },
  { id: '1h', label: 'Last hour', durationMs: HOUR },
  { id: '12h', label: 'Last 12 hours', durationMs: 12 * HOUR },
  { id: '24h', label: 'Last 24 hours', durationMs: DAY },
  { id: '7d', label: 'Last 7 days', durationMs: 7 * DAY },
];

export const DEFAULT_TIME_RANGE = TIME_RANGE_OPTIONS[1];

const TIME_RANGE_MAP = new Map(TIME_RANGE_OPTIONS.map((option) => [option.id, option]));

export function getTimeRangeById(id: string): TimeRangeOption {
  return TIME_RANGE_MAP.get(id) ?? DEFAULT_TIME_RANGE;
}

export function computeTimeRangeBounds(option: TimeRangeOption) {
  const end = Date.now();
  const start = end - option.durationMs;
  return { start, end };
}

export function formatTimeRange(option: TimeRangeOption) {
  return option.label;
}

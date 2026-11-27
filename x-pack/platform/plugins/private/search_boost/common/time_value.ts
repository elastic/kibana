/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MS_PER_UNIT: Readonly<Record<string, number>> = {
  d: 86_400_000,
  h: 3_600_000,
  m: 60_000,
  s: 1_000,
  ms: 1,
  micros: 0.001,
  nanos: 0.000001,
};

/** An Elasticsearch time value such as "7d". Negative milliseconds come without a unit. */
export const splitTimeValue = (value: string): { size: number; unit: string } | undefined => {
  const match = /^(-?\d+(?:\.\d+)?)([a-z]*)$/.exec(value.trim());
  return match ? { size: Number(match[1]), unit: match[2] } : undefined;
};

/** Milliseconds in an Elasticsearch time value, or `NaN` when it can't be read. */
export const timeValueToMs = (value: string): number => {
  const parsed = splitTimeValue(value);
  const msPerUnit = parsed && MS_PER_UNIT[parsed.unit || 'ms'];
  return parsed && msPerUnit !== undefined ? parsed.size * msPerUnit : NaN;
};

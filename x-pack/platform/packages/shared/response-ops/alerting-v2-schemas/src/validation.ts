/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';

const DURATION_RE = /^(\d+)(ms|s|m|h|d|w)$/;

const DURATION_UNIT_TO_MS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

export function parseDurationToMs(value: string): number {
  const match = DURATION_RE.exec(value);
  if (!match) return NaN;
  return parseInt(match[1], 10) * DURATION_UNIT_TO_MS[match[2]];
}

/**
 * Validate a duration string format (e.g., "5m", "1h", "30s", "250ms")
 * @returns Error message if invalid, undefined if valid
 */
export function validateDuration(value: string): string | void {
  if (!DURATION_RE.test(value)) {
    return `Invalid duration "${value}". Expected format like "5m", "1h", "30s", "250ms"`;
  }
}

/**
 * Validate that a duration string does not exceed a maximum duration.
 * Both values must be valid duration strings.
 * @returns Error message if exceeded, undefined if valid
 */
export function validateMaxDuration(value: string, max: string): string | void {
  const valueMs = parseDurationToMs(value);
  const maxMs = parseDurationToMs(max);
  if (!isNaN(valueMs) && !isNaN(maxMs) && valueMs > maxMs) {
    return `Duration "${value}" exceeds the maximum allowed value of "${max}"`;
  }
}

/**
 * Validate that a duration string is not below a minimum duration.
 * Both values must be valid duration strings.
 * @returns Error message if below minimum, undefined if valid
 */
export function validateMinDuration(value: string, min: string): string | void {
  const valueMs = parseDurationToMs(value);
  const minMs = parseDurationToMs(min);
  if (!isNaN(valueMs) && !isNaN(minMs) && valueMs < minMs) {
    return `Duration "${value}" is below the minimum allowed value of "${min}"`;
  }
}

/**
 * Validate an ES|QL query string
 * @returns Error message if invalid, undefined if valid
 */
export function validateEsqlQuery(query: string): string | void {
  const errors = Parser.parseErrors(query);
  if (errors.length > 0) {
    return `Invalid ES|QL query: ${errors[0].message}`;
  }
}

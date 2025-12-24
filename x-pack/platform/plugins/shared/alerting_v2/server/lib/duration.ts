/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const DURATION_RE = /^(\d+)(ms|s|m|h|d|w)$/;

export function validateDuration(value: string): string | void {
  if (!DURATION_RE.test(value)) {
    return `Invalid duration "${value}". Expected format like "5m", "1h", "30s", "250ms"`;
  }
}

export function parseDurationToMs(value: string): number {
  const match = value.match(DURATION_RE);
  if (!match) {
    throw new Error(`Invalid duration "${value}"`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 'ms':
      return amount;
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    case 'w':
      return amount * 7 * 24 * 60 * 60 * 1000;
    default:
      // exhaustive
      throw new Error(`Unsupported duration unit "${unit}"`);
  }
}

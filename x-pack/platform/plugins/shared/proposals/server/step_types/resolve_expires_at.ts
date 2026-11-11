/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Units and ordering deliberately mirror the workflow engine's own duration
 * grammar, because the same `expiresIn` value is also handed to the gate's HITL
 * `timeout`. A duration the engine accepts must be one we can resolve, or the
 * deadline shown to an analyst would disagree with the one the gate enforces.
 */
const UNIT_MS = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
} as const;

/** Units must appear at most once, in descending order: `1w2d3h4m5s6ms`. */
const DURATION_PATTERN = /^(?:\d+w)?(?:\d+d)?(?:\d+h)?(?:\d+m)?(?:\d+s)?(?:\d+ms)?$/;
const COMPONENT_PATTERN = /(\d+)(ms|s|m|h|d|w)(?![a-zA-Z])/g;

export const parseDurationMs = (duration: string): number => {
  if (!duration || !DURATION_PATTERN.test(duration)) {
    throw new Error(
      `Invalid duration format: ${duration}. Use a format like "24h" or "1w2d3h", with units in descending order.`
    );
  }

  let total = 0;
  for (const [, value, unit] of duration.matchAll(COMPONENT_PATTERN)) {
    total += Number(value) * UNIT_MS[unit as keyof typeof UNIT_MS];
  }

  if (total === 0) {
    throw new Error(`Duration must be greater than zero: ${duration}`);
  }

  return total;
};

/**
 * Turns a caller's relative `expiresIn` into the absolute deadline we store.
 * Resolved once at creation: a duration is relative to when the proposal was
 * made, so recomputing it on every read would keep moving the deadline.
 */
export const resolveExpiresAt = (
  expiresIn: string | undefined,
  now = Date.now()
): string | undefined => {
  if (expiresIn === undefined) {
    return undefined;
  }
  return new Date(now + parseDurationMs(expiresIn)).toISOString();
};

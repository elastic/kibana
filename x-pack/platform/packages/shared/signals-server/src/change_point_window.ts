/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MINUTE_MS = 60 * 1000;
/** Short alert windows are widened to this, matching APM's alert-context lookback. */
const PREFERRED_WINDOW_MS = 6 * 60 * MINUTE_MS;

/**
 * Returns an ISO window for change point detection. A short alert window is widened
 * backward from its end. A longer window is kept, because APM sizes its own buckets.
 */
export const changePointWindow = (from: string, to: string): { start: string; end: string } => {
  const endMs = Date.parse(to);
  const startMs = Date.parse(from);
  if (!Number.isFinite(endMs) || !Number.isFinite(startMs) || endMs <= startMs) {
    return { start: from, end: to };
  }

  const widened = Math.max(endMs - startMs, PREFERRED_WINDOW_MS);
  return {
    start: new Date(endMs - widened).toISOString(),
    end: new Date(endMs).toISOString(),
  };
};

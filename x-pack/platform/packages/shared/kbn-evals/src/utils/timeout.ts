/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MS_PER_MINUTE = 60_000;

/**
 * Parses a run's requested Playwright test timeout in minutes, returning undefined when it's
 * empty or unset. Whole minutes only, so a typo like `1e2` or `90m` fails loudly instead of
 * silently falling back to the suite default mid-sweep.
 */
export const parseTimeoutMinutes = (value: string | undefined): number | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const minutes = Number(trimmed);
  if (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(minutes * MS_PER_MINUTE) || minutes < 1) {
    throw new Error(`EVAL_TIMEOUT_MINUTES must be a positive integer, got "${value}".`);
  }

  return minutes;
};

/** The per-test timeout in milliseconds requested through `EVAL_TIMEOUT_MINUTES`, if any. */
export const getTimeoutMsFromEnv = (): number | undefined => {
  const minutes = parseTimeoutMinutes(process.env.EVAL_TIMEOUT_MINUTES);
  return minutes === undefined ? undefined : minutes * MS_PER_MINUTE;
};

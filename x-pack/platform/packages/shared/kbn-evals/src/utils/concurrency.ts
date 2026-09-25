/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Examples an experiment runs at once when neither the spec nor the run sets it. */
export const DEFAULT_EXPERIMENT_CONCURRENCY = 5;

/**
 * Reads how many examples an experiment runs at once, as `--concurrency` or
 * `EVAL_CONCURRENCY` gave it. Undefined means the run didn't set one.
 *
 * Called both where `--concurrency` is read, so a bad value fails before the
 * stack boots, and where the Playwright config picks the value back up.
 */
export const parseConcurrency = (value: string | undefined): number | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const concurrency = Number(trimmed);
  if (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new Error(`--concurrency must be a positive integer, got "${value}".`);
  }

  return concurrency;
};

/** The concurrency the run was started with, as {@link parseConcurrency} read it. */
export const getConcurrencyFromEnv = (): number | undefined =>
  parseConcurrency(process.env.EVAL_CONCURRENCY);

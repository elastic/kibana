/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Examples an experiment runs at once when neither the spec nor the run sets it. */
export const DEFAULT_EXPERIMENT_CONCURRENCY = 5;

/** Parses a run's requested concurrency, returning undefined when it's empty or unset. */
export const parseConcurrency = (
  value: string | undefined,
  source: '--concurrency' | 'EVAL_CONCURRENCY'
): number | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const concurrency = Number(trimmed);
  if (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new Error(`${source} must be a positive integer, got "${value}".`);
  }

  return concurrency;
};

/** The concurrency requested through `EVAL_CONCURRENCY`, if any. */
export const getConcurrencyFromEnv = (): number | undefined =>
  parseConcurrency(process.env.EVAL_CONCURRENCY, 'EVAL_CONCURRENCY');

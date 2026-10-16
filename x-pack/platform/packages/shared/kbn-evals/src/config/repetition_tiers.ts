/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Repetition budget by intent. A single LLM-graded run is not a measurement:
 * on the persona matrix, an identical rerun flips 56.9% of judge-graded cells
 * (14.7% for deterministic contract evaluators). Smoke runs catch breakage
 * across the whole field cheaply; confirm and publish runs spend repetitions
 * on the models whose ordering is actually being decided.
 */
export const REPETITION_TIERS = {
  smoke: 1,
  confirm: 3,
  publish: 5,
} as const;

export type RepetitionTier = keyof typeof REPETITION_TIERS;

const isRepetitionTier = (value: string): value is RepetitionTier =>
  Object.prototype.hasOwnProperty.call(REPETITION_TIERS, value);

const parsePositiveInt = (raw: string | undefined): number | undefined => {
  const value = parseInt(raw ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

/**
 * Resolves the repetition count. Priority: explicit `EVAL_REPETITIONS`, then
 * `EVAL_REPETITION_TIER`, then the suite's configured value, then 1.
 *
 * An unknown tier, or a tier that disagrees with an explicit count, throws: a
 * publish run silently degraded to n=1 would ship a board that looks measured
 * and is not.
 */
export const resolveRepetitions = (
  env: Record<string, string | undefined>,
  configured?: number
): number => {
  const explicit = parsePositiveInt(env.EVAL_REPETITIONS);
  const rawTier = env.EVAL_REPETITION_TIER?.trim().toLowerCase();

  if (!rawTier) {
    return explicit ?? configured ?? 1;
  }

  if (!isRepetitionTier(rawTier)) {
    throw new Error(
      `Unknown EVAL_REPETITION_TIER "${
        env.EVAL_REPETITION_TIER
      }". Expected one of: ${Object.entries(REPETITION_TIERS)
        .map(([tier, n]) => `${tier} (n=${n})`)
        .join(', ')}.`
    );
  }

  const tierRepetitions = REPETITION_TIERS[rawTier];
  if (explicit !== undefined && explicit !== tierRepetitions) {
    throw new Error(
      `EVAL_REPETITIONS=${explicit} contradicts EVAL_REPETITION_TIER=${rawTier} (n=${tierRepetitions}). Set one or the other.`
    );
  }
  return tierRepetitions;
};

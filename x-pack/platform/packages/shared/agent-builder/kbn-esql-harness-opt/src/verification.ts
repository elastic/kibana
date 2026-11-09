/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SeedDelta {
  exampleId: string;
  question: string;
  provenance: string;
  incumbent: number;
  candidate: number;
  delta: number;
}

export interface ManifestVerification {
  predictedFixes: number;
  fixesConfirmed: number;
  predictedRegressions: number;
  regressionsConfirmed: number;
  unpredictedRegressions: number;
  /** Fraction of predicted fixes that actually improved; the proposer's calibration score. */
  precision: number;
  details: Array<{
    question: string;
    predicted: 'fix' | 'regression';
    delta: number;
    confirmed: boolean;
  }>;
}

const EPSILON = 0.05;

/** Predictions are written as question prefixes, so matching is prefix-and-substring based. */
const matches = (prediction: string, question: string): boolean => {
  const needle = prediction.trim().toLowerCase().slice(0, 60);
  return needle.length > 8 && question.toLowerCase().includes(needle);
};

/**
 * Check a round's predicted-fix / predicted-regression manifest against what actually happened.
 *
 * This is the falsifiable-contract idea from the review: a proposer that cannot predict which
 * examples its edit will fix is pattern-matching on the bundle, and its rationale should not be
 * trusted in the next round. The score is fed back into the following proposal.
 */
export const verifyManifest = ({
  manifest,
  seedDeltas,
}: {
  manifest: { predictedFixes?: string[]; predictedRegressions?: string[] };
  seedDeltas: SeedDelta[];
}): ManifestVerification => {
  const fixes = manifest.predictedFixes ?? [];
  const regressions = manifest.predictedRegressions ?? [];
  const details: ManifestVerification['details'] = [];

  let fixesConfirmed = 0;
  for (const prediction of fixes) {
    const hit = seedDeltas.find((seed) => matches(prediction, seed.question));
    const confirmed = Boolean(hit && hit.delta > EPSILON);
    if (confirmed) fixesConfirmed++;
    details.push({
      question: hit?.question ?? prediction,
      predicted: 'fix',
      delta: hit?.delta ?? 0,
      confirmed,
    });
  }

  let regressionsConfirmed = 0;
  for (const prediction of regressions) {
    const hit = seedDeltas.find((seed) => matches(prediction, seed.question));
    const confirmed = Boolean(hit && hit.delta < -EPSILON);
    if (confirmed) regressionsConfirmed++;
    details.push({
      question: hit?.question ?? prediction,
      predicted: 'regression',
      delta: hit?.delta ?? 0,
      confirmed,
    });
  }

  const actualRegressions = seedDeltas.filter((seed) => seed.delta < -EPSILON);
  const unpredictedRegressions = actualRegressions.filter(
    (seed) => !regressions.some((prediction) => matches(prediction, seed.question))
  ).length;

  return {
    predictedFixes: fixes.length,
    fixesConfirmed,
    predictedRegressions: regressions.length,
    regressionsConfirmed,
    unpredictedRegressions,
    precision: fixes.length === 0 ? 0 : fixesConfirmed / fixes.length,
    details,
  };
};

/** One-paragraph feedback handed to the next proposal, so a round learns from the last one. */
export const verificationSummary = (verification: ManifestVerification): string =>
  `Last round you predicted ${verification.predictedFixes} fixes; ${verification.fixesConfirmed} ` +
  `actually improved (precision ${(verification.precision * 100).toFixed(0)}%). You predicted ` +
  `${verification.predictedRegressions} regressions, ${verification.regressionsConfirmed} happened, ` +
  `and ${verification.unpredictedRegressions} regressions you did not predict occurred.`;

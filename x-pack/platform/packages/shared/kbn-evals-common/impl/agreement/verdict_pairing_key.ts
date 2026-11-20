/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Identity of one evaluator verdict, enough to pair it with a verdict another rater (a second
 * judge or a human) produced for the same unit of work.
 */
export interface VerdictPairingFields {
  /** Suite that produced the verdict; keeps example ids reused across suites from pairing. */
  suiteId?: string;
  exampleId: string;
  repetition: number;
  evaluator: string;
}

/** Pairs verdicts by (suite, example, repetition, evaluator). */
export const verdictPairingKey = ({
  suiteId,
  exampleId,
  repetition,
  evaluator,
}: VerdictPairingFields): string =>
  `${suiteId ?? ''}\u0000${exampleId}\u0000${repetition}\u0000${evaluator}`;

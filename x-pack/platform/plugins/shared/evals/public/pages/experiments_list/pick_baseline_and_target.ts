/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationExperimentSummary } from '@kbn/evals-common';

const MAIN_BRANCH = 'main';

/**
 * The baseline is the run on main when only one of the two runs is on main.
 * Otherwise the baseline is the older run. Runs with the same time keep the given order.
 */
export const pickBaselineAndTarget = <
  T extends Pick<EvaluationExperimentSummary, 'git_branch' | 'timestamp'>
>(
  a: T,
  b: T
): { baseline: T; target: T } => {
  const aOnMain = a.git_branch === MAIN_BRANCH;
  const bOnMain = b.git_branch === MAIN_BRANCH;
  const bIsBaseline =
    aOnMain !== bOnMain ? bOnMain : Date.parse(b.timestamp) < Date.parse(a.timestamp);

  return bIsBaseline ? { baseline: b, target: a } : { baseline: a, target: b };
};

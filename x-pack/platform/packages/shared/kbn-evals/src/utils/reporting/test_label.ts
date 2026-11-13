/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult, StatisticalTestId } from '@kbn/evals-common';

const TEST_LABELS: Record<StatisticalTestId, string> = {
  paired_t: 't-test',
  wilcoxon_signed_rank: 'Wilcoxon',
  mcnemar: 'McNemar',
};

export function getTestLabel(id: StatisticalTestId): string {
  return TEST_LABELS[id];
}

export function formatDiscordantPairs(hypothesisTest: ComparisonResult['hypothesisTest']): string {
  const { discordantPairs } = hypothesisTest;
  if (!discordantPairs) {
    return '';
  }
  return ` (${discordantPairs.targetOnly} target only, ${discordantPairs.baselineOnly} baseline only)`;
}

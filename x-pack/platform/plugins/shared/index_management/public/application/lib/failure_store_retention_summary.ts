/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDlmDataPhasesLabel, getRetentionPeriod } from './data_streams';

export type FailureStoreRetentionBehavior = 'data_stream' | 'index_template';

interface BuildFailureStoreRetentionSummaryLabels {
  disabledLabel: string;
  infiniteLabel: string;
}

interface BuildFailureStoreRetentionSummaryOptions {
  showPhaseCounts: boolean;
  finitePhaseCount?: number;
  infinitePhaseCount?: number;
}

export const buildFailureStoreRetentionSummary = (
  {
    enabled,
    retention,
    retentionDisabled,
  }: {
    enabled: boolean;
    retention?: string;
    retentionDisabled: boolean;
  },
  behavior: FailureStoreRetentionBehavior,
  labels: BuildFailureStoreRetentionSummaryLabels,
  {
    showPhaseCounts,
    finitePhaseCount = 2,
    infinitePhaseCount = 1,
  }: BuildFailureStoreRetentionSummaryOptions
): string => {
  if (!enabled) {
    return labels.disabledLabel;
  }

  const hasFiniteRetention = typeof retention === 'string' && retention.length > 0;

  if (behavior === 'index_template') {
    const retentionLabel =
      !retentionDisabled && hasFiniteRetention
        ? getRetentionPeriod(retention)
        : labels.infiniteLabel;

    const phaseCount = retentionDisabled ? infinitePhaseCount : finitePhaseCount;
    const phasesLabel = showPhaseCounts ? getDlmDataPhasesLabel(phaseCount) : undefined;

    return [retentionLabel, phasesLabel].filter(Boolean).join(' · ');
  }

  const retentionLabel =
    !retentionDisabled && hasFiniteRetention ? getRetentionPeriod(retention) : labels.infiniteLabel;

  const phaseCount =
    !retentionDisabled && hasFiniteRetention
      ? finitePhaseCount
      : showPhaseCounts
      ? infinitePhaseCount
      : undefined;
  const phasesLabel =
    showPhaseCounts && phaseCount != null ? getDlmDataPhasesLabel(phaseCount) : undefined;

  return [retentionLabel, phasesLabel].filter(Boolean).join(' · ');
};

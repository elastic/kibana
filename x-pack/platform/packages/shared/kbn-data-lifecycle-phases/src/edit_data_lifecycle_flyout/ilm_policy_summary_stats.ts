/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicyForFlyout } from './types';

type PhasesForStats = IlmPolicyForFlyout['phases'];

export interface IlmPolicySummaryStats {
  deleteAfter: string | null;
  phaseCount: number;
  downsampleStepCount: number;
}

export const getIlmPolicySummaryStats = (phases: PhasesForStats): IlmPolicySummaryStats => {
  const phaseCount = Object.keys(phases).filter((p) => p !== 'delete').length;

  const deleteAfter =
    phases.delete?.actions?.delete !== undefined && phases.delete?.min_age
      ? phases.delete.min_age
      : null;

  // Downsampling is only supported in the hot/warm/cold phases (not frozen).
  const downsampleStepCount = (['hot', 'warm', 'cold'] as const).reduce((count, phase) => {
    const downsample = phases[phase]?.actions?.downsample;
    return downsample ? count + 1 : count;
  }, 0);

  return { deleteAfter, phaseCount, downsampleStepCount };
};

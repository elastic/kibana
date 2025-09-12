/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateGapFillAutoSchedulerParams } from '../methods/update/types';

export interface GapAutoFillSchedulerUpdateAttributes {
  name?: string;
  enabled?: boolean;
  schedule?: { interval: string };
  rulesFilter?: string;
  gapFillRange?: string;
  maxAmountOfGapsToProcessPerRun?: number;
  maxAmountOfRulesToProcessPerRun?: number;
  amountOfRetries?: number;
  updatedBy?: string;
  updatedAt: string;
}

export const transformGapAutoFillSchedulerUpdateParams = (
  updates: UpdateGapFillAutoSchedulerParams,
  updatedBy?: string
): GapAutoFillSchedulerUpdateAttributes => {
  const nowIso = new Date().toISOString();

  return {
    ...(updates.name !== undefined && { name: updates.name }),
    ...(updates.enabled !== undefined && { enabled: updates.enabled }),
    ...(updates.schedule !== undefined && { schedule: updates.schedule }),
    ...(updates.rulesFilter !== undefined && { rulesFilter: updates.rulesFilter }),
    ...(updates.gapFillRange !== undefined && { gapFillRange: updates.gapFillRange }),
    ...(updates.maxAmountOfGapsToProcessPerRun !== undefined && {
      maxAmountOfGapsToProcessPerRun: updates.maxAmountOfGapsToProcessPerRun,
    }),
    ...(updates.maxAmountOfRulesToProcessPerRun !== undefined && {
      maxAmountOfRulesToProcessPerRun: updates.maxAmountOfRulesToProcessPerRun,
    }),
    ...(updates.amountOfRetries !== undefined && { amountOfRetries: updates.amountOfRetries }),
    ...(updatedBy && { updatedBy }),
    updatedAt: nowIso,
  };
};

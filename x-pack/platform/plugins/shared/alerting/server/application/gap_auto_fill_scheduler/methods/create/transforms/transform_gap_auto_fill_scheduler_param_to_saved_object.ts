/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateGapFillAutoSchedulerParams } from '../types';

interface GapAutoFillSchedulerSavedObjectAttributes {
  name?: string;
  enabled: boolean;
  schedule: { interval: string };
  rulesFilter: string;
  gapFillRange: string;
  maxAmountOfGapsToProcessPerRun: number;
  maxAmountOfRulesToProcessPerRun: number;
  amountOfRetries: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

export const transformGapAutoFillSchedulerCreateParamToSavedObject = (
  params: CreateGapFillAutoSchedulerParams,
  {
    createdBy,
    createdAt,
    updatedAt,
    updatedBy,
  }: {
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
    updatedBy: string | null;
  }
): GapAutoFillSchedulerSavedObjectAttributes => {
  return {
    name: params.name,
    enabled: params.enabled ?? true,
    schedule: params.schedule,
    rulesFilter: params.rulesFilter ?? '',
    gapFillRange: params.gapFillRange,
    maxAmountOfGapsToProcessPerRun: params.maxAmountOfGapsToProcessPerRun,
    maxAmountOfRulesToProcessPerRun: params.maxAmountOfRulesToProcessPerRun,
    amountOfRetries: params.amountOfRetries,
    createdBy,
    createdAt,
    updatedAt,
    updatedBy,
  };
};

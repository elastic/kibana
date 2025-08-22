/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { getGapFillAutoSchedulerSchema } from '../schemas';

export type GetGapFillAutoSchedulerParams = TypeOf<typeof getGapFillAutoSchedulerSchema>;

export interface GapFillAutoSchedulerResponse {
  id: string;
  name: string;
  enabled: boolean;
  schedule: { interval: string };
  rulesFilter: string;
  gapFillRange: string;
  maxAmountOfGapsToProcessPerRun: number;
  maxAmountOfRulesToProcessPerRun: number;
  amountOfRetries: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  lastRun?: string | null;
  scheduledTaskId: string;
}

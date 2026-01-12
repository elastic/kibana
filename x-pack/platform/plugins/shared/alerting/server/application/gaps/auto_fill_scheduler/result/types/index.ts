/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { gapAutoFillSchedulerSchema } from '../schemas';

export type GapAutoFillScheduler = TypeOf<typeof gapAutoFillSchedulerSchema>;

export interface GapAutoFillSchedulerResponse {
  id: string;
  name: string;
  enabled: boolean;
  schedule: { interval: string };
  gapFillRange: string;
  ruleTypes: Array<{ type: string; consumer: string }>;
  scope: string[];
  maxBackfills: number;
  numRetries: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

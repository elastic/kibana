/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GapAutoFillSchedulerSO {
  id: string;
  name: string;
  enabled: boolean;
  schedule: { interval: string };
  gapFillRange: string;
  maxBackfills: number;
  numRetries: number;
  scope: string[];
  ruleTypes: Array<{ type: string; consumer: string }>;
  ruleTypeConsumerPairs: string[];
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GapAutoFillScheduler {
  id: string;
  name: string;
  enabled: boolean;
  schedule: { interval: string };
  gapFillRange: string;
  maxBackfills: number;
  numRetries: number;
  scope: string[];
  ruleTypes: Array<{ type: string; consumer: string }>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

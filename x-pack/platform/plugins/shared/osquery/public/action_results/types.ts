/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ActionAgentStatus {
  SUCCESS = 'success',
  PENDING = 'pending',
  FAILED = 'failed',
}

export interface ActionResultsSummaryProps {
  actionId: string;
  startDate?: string;
  expirationDate?: string;
  agentIds?: string[];
  error?: string;
  scheduleId?: string;
  executionCount?: number;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared snooze entry types used by the Alert class and alerts client.
 * Defined here to avoid circular dependencies between alert and alerts_client.
 */
export interface SnoozedInstanceConfig {
  expiresAt?: string;
  conditions?: Array<{
    type: string;
    field: string;
    value?: string;
    snapshotValue?: string;
  }>;
  conditionOperator?: 'any' | 'all';
}

export type SnoozedInstanceEntry = { instanceId: string } & SnoozedInstanceConfig;

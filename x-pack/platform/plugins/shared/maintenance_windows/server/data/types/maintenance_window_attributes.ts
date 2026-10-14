/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RRuleAttributes } from './r_rule_attributes';
import type {
  AlertsFilterQueryAttributes,
  AlertingV2ScopeAttributes,
} from './alerts_filter_query_attributes';
import type { Schedule } from '../../application/types';

export const maintenanceWindowCategoryIdTypes = {
  OBSERVABILITY: 'observability',
  SECURITY_SOLUTION: 'securitySolution',
  MANAGEMENT: 'management',
} as const;

export type MaintenanceWindowCategoryIdTypes =
  (typeof maintenanceWindowCategoryIdTypes)[keyof typeof maintenanceWindowCategoryIdTypes];

export interface MaintenanceWindowEventAttributes {
  gte: string;
  lte: string;
}

export interface MaintenanceWindowAttributes {
  title: string;
  enabled: boolean;
  duration: number;
  expirationDate: string;
  events: MaintenanceWindowEventAttributes[];
  rRule: RRuleAttributes;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  categoryIds?: MaintenanceWindowCategoryIdTypes[] | null;
  scopedQuery?: AlertsFilterQueryAttributes | null;
  schedule: { custom: Schedule };
  scope?: {
    /**
     * Absent on pre-MV5 documents and on documents last written by a node rolled back to MV4.
     * The decoder treats an absent flag as `true` — the same meaning MV4 conveyed via `alerting`.
     */
    alertingEnabled?: boolean;
    /**
     * MV4 shape (immutable). `null` = alerting v1 selected but no filter; object = filtered.
     * Do NOT add fields inside `alerting`; MV4's forwardCompatibility schema rejects unknown ones.
     */
    alerting?: AlertsFilterQueryAttributes | null;
    alertingV2?: AlertingV2ScopeAttributes;
  };
}

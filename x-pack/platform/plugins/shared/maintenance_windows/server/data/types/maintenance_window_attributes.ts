/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsFilterQueryAttributes } from './alerts_filter_query_attributes';
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
  expirationDate: string;
  events: MaintenanceWindowEventAttributes[];
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  schedule: { custom: Schedule };
  scope?: {
    alerting: AlertsFilterQueryAttributes | null;
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRuleAttributes } from '../../r_rule/types';
import type { MaintenanceWindowCategoryIdTypes } from '../constants';
import { AlertsFilterQueryAttributes } from '../../alerts_filter_query/types';

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
}

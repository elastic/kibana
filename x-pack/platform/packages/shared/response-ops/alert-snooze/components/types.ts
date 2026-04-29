/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';

export type SnoozeUnit = 'm' | 'h' | 'd' | 'w' | 'M';
export type QuickDurationId = 'indefinitely' | '1h' | '8h' | '24h' | 'custom';
export type CustomSnoozeMode = 'duration' | 'datetime';
export type SnoozePanelTab = 'quick' | 'conditional';

export interface CustomDurationState {
  mode: CustomSnoozeMode;
  value: number;
  unit: SnoozeUnit;
  dateTime: Moment | null;
}

export type AlertSeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export enum DataConditionType {
  FIELD_CHANGE = 'field_change',
  SEVERITY_CHANGE = 'severity_change',
  SEVERITY_EQUALS = 'severity_equals',
}

export type SnoozeCondition =
  | { type: DataConditionType.SEVERITY_CHANGE }
  | { type: DataConditionType.SEVERITY_EQUALS; value: AlertSeverityLevel }
  | { type: DataConditionType.FIELD_CHANGE; field: string };

export interface ConditionalSnoozeSchedule {
  expiresAt?: string | null;
  conditions?: SnoozeCondition[];
  conditionOperator?: 'any' | 'all';
}

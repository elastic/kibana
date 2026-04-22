/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';
import type { SavedObjectsClientContract } from '@kbn/core/server';

export interface RuleDoctorRRuleConfig {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  tzid: string;
  dtstart?: string;
  byhour?: number[];
  byminute?: number[];
  byweekday?: string[];
  bymonthday?: number[];
  bymonth?: number[];
}

export interface RuleDoctorSettings {
  scheduleEnabled: boolean;
  scheduleType: 'interval' | 'rrule';
  interval?: string;
  rrule?: RuleDoctorRRuleConfig;
}

export const DEFAULT_RULE_DOCTOR_SETTINGS: RuleDoctorSettings = {
  scheduleEnabled: false,
  scheduleType: 'interval',
  interval: '1d',
};

export const RULE_DOCTOR_SETTINGS_SO_ID = 'rule-doctor-settings-singleton';

export const RuleDoctorSettingsSavedObjectsClientToken = Symbol.for(
  'alerting_v2.RuleDoctorSettingsSavedObjectsClient'
) as ServiceIdentifier<SavedObjectsClientContract>;

const INTERVAL_RE = /^(\d+)([smhd])$/;
const MIN_SECONDS = 86400; // 1 day

const UNIT_TO_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

export function validateMinimumInterval(interval: string): void {
  const match = interval.match(INTERVAL_RE);
  if (!match) {
    throw new Error(
      `Invalid interval format: "${interval}". Use format like "1d", "2d", "7d", "12h".`
    );
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const totalSeconds = value * UNIT_TO_SECONDS[unit];
  if (totalSeconds < MIN_SECONDS) {
    throw new Error(
      `Interval "${interval}" is below the minimum of 1 day. Rule Doctor analysis is resource-intensive.`
    );
  }
}

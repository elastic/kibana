/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectOption } from '@elastic/eui';
import * as i18n from './translations';

export const THRESHOLD_UNITS: EuiSelectOption[] = [
  { text: i18n.DAYS, value: 'days' },
  { text: i18n.MONTHS, value: 'months' },
  { text: i18n.YEARS, value: 'years' },
];

export const THRESHOLD_UNITS_SINGULAR: EuiSelectOption[] = [
  { text: i18n.DAY, value: 'days' },
  { text: i18n.MONTH, value: 'months' },
  { text: i18n.YEAR, value: 'years' },
];

export const MAX_ALERT_DELETE_THRESHOLD_DAYS = 3 * 365; // 3 years
export const MIN_ALERT_DELETE_THRESHOLD_DAYS = 1; // 1 day

export const DEFAULT_THRESHOLD_ENABLED = false;
export const DEFAULT_THRESHOLD = 3;
export const DEFAULT_THRESHOLD_UNIT: EuiSelectOption = THRESHOLD_UNITS[1]; // months

export const INTERNAL_BASE_ALERTING_API_PATH = '/internal/alerting';

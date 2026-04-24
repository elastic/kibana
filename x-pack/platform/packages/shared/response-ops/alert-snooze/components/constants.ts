/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnoozeUnit } from './types';
import * as i18n from './translations';

export const SNOOZE_DATE_DISPLAY_FORMAT = 'MMM D, YYYY [at] h:mm A';

export const SNOOZE_UNIT_OPTIONS: Array<{ value: SnoozeUnit; text: string }> = [
  { value: 'm', text: i18n.UNIT_MINUTES },
  { value: 'h', text: i18n.UNIT_HOURS },
  { value: 'd', text: i18n.UNIT_DAYS },
  { value: 'w', text: i18n.UNIT_WEEKS },
  { value: 'M', text: i18n.UNIT_MONTHS },
];

export const CUSTOM_MODE_BUTTONS = [
  { id: 'duration', label: i18n.CUSTOM_MODE_DURATION, iconType: 'clock' },
  { id: 'datetime', label: i18n.CUSTOM_MODE_DATETIME, iconType: 'calendar' },
];

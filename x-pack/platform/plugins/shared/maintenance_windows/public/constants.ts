/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MaintenanceWindowStatus } from '../common';
import * as i18n from './translations';

export const STATUS_DISPLAY = {
  [MaintenanceWindowStatus.Running]: { color: 'primary', label: i18n.TABLE_STATUS_RUNNING },
  [MaintenanceWindowStatus.Upcoming]: { color: 'warning', label: i18n.TABLE_STATUS_UPCOMING },
  [MaintenanceWindowStatus.Finished]: { color: 'success', label: i18n.TABLE_STATUS_FINISHED },
  [MaintenanceWindowStatus.Archived]: { color: 'default', label: i18n.TABLE_STATUS_ARCHIVED },
  [MaintenanceWindowStatus.Disabled]: { color: 'default', label: i18n.TABLE_STATUS_DISABLED },
};

export const STATUS_SORT = {
  [MaintenanceWindowStatus.Running]: 0,
  [MaintenanceWindowStatus.Upcoming]: 1,
  [MaintenanceWindowStatus.Finished]: 2,
  [MaintenanceWindowStatus.Archived]: 3,
  [MaintenanceWindowStatus.Disabled]: 4,
};

export const STATUS_OPTIONS = [
  { value: MaintenanceWindowStatus.Running, name: i18n.TABLE_STATUS_RUNNING },
  { value: MaintenanceWindowStatus.Upcoming, name: i18n.TABLE_STATUS_UPCOMING },
  { value: MaintenanceWindowStatus.Finished, name: i18n.TABLE_STATUS_FINISHED },
  { value: MaintenanceWindowStatus.Archived, name: i18n.TABLE_STATUS_ARCHIVED },
  { value: MaintenanceWindowStatus.Disabled, name: i18n.TABLE_STATUS_DISABLED },
];

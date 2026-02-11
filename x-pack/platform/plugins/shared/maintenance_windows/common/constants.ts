/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-types';

export enum MaintenanceWindowStatus {
  Running = 'running',
  Upcoming = 'upcoming',
  Finished = 'finished',
  Archived = 'archived',
  Disabled = 'disabled',
}

export const MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE = 'maintenance-window';
export const MAINTENANCE_WINDOW_FEATURE_ID = 'maintenanceWindow';
export const MAINTENANCE_WINDOW_API_PRIVILEGES = {
  READ_MAINTENANCE_WINDOW: 'read-maintenance-window',
  WRITE_MAINTENANCE_WINDOW: 'write-maintenance-window',
};

export const MAINTENANCE_WINDOWS_APP_ID = 'maintenanceWindows';
export const MANAGEMENT_APP_ID = 'management';

export const MAINTENANCE_WINDOW_PATHS = {
  maintenanceWindows: `/${MAINTENANCE_WINDOWS_APP_ID}`,
  maintenanceWindowsCreate: '/create',
  maintenanceWindowsEdit: '/edit/:maintenanceWindowId',
};

export const MAINTENANCE_WINDOW_DEEP_LINK_IDS = {
  maintenanceWindows: MAINTENANCE_WINDOWS_APP_ID,
  maintenanceWindowsCreate: 'create',
  maintenanceWindowsEdit: 'edit',
};

export const MAINTENANCE_WINDOW_DATE_FORMAT = 'MM/DD/YY hh:mm A';

export const MAINTENANCE_WINDOW_DEFAULT_PER_PAGE = 10 as const;
export const MAINTENANCE_WINDOW_DEFAULT_TABLE_ACTIVE_PAGE = 1 as const;

export const PLUGIN = {
  ID: 'maintenanceWindows',
  MINIMUM_LICENSE_REQUIRED: 'platinum' as LicenseType,

  getI18nName: (i18n: any): string =>
    i18n.translate('xpack.maintenanceWindows.appName', {
      defaultMessage: 'Maintenance Windows',
    }),
};

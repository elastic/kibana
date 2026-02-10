/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindow } from '../server/application/types';

export type {
  MaintenanceWindowModificationMetadata,
  DateRange,
  MaintenanceWindowSOProperties,
  MaintenanceWindowSOAttributes,
  MaintenanceWindowCreateBody,
  MaintenanceWindowClientContext,
  ScopedQueryAttributes,
  MaintenanceWindowDeepLinkIds,
} from './types';

export type { MaintenanceWindow } from '../server/application/types';
export type { FindMaintenanceWindowsResult } from '../server/application/methods/find/types';

export {
  MaintenanceWindowStatus,
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  MAINTENANCE_WINDOW_FEATURE_ID,
  MAINTENANCE_WINDOW_API_PRIVILEGES,
  MAINTENANCE_WINDOWS_APP_ID,
  MANAGEMENT_APP_ID,
  MAINTENANCE_WINDOW_PATHS,
  MAINTENANCE_WINDOW_DEEP_LINK_IDS,
  MAINTENANCE_WINDOW_DATE_FORMAT,
  MAINTENANCE_WINDOW_DEFAULT_PER_PAGE,
  MAINTENANCE_WINDOW_DEFAULT_TABLE_ACTIVE_PAGE,
} from './constants';

export type MaintenanceWindowUI = Omit<MaintenanceWindow, 'schedule' | 'scope'>;

export {
  getScopedQueryErrorMessage,
  isScopedQueryError,
} from './maintenance_window_scoped_query_error_message';

export type { MaintenanceWindowAttributes } from '../server/data/types/maintenance_window_attributes';

// export only necessary server types
export type { MaintenanceWindowCategoryIds } from '../server/routes/schemas/maintenance_window/shared';
export type { MaintenanceWindowResponse } from '../server/routes/schemas/maintenance_window/internal/response';
export type { FindMaintenanceWindowsResponse } from '../server/routes/schemas/maintenance_window/internal/request/find';
export type { CreateMaintenanceWindowRequestBody } from '../server/routes/schemas/maintenance_window/internal/request/create';
export type { UpdateMaintenanceWindowRequestBody } from '../server/routes/schemas/maintenance_window/internal/request/update';

// Internal
export const INTERNAL_BASE_ALERTING_API_PATH = '/internal/alerting' as const;
export const INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH =
  `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window` as const;
export const INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH =
  `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/_active` as const;

// External
export const BASE_ALERTING_API_PATH = '/api/alerting';
export const BASE_MAINTENANCE_WINDOW_API_PATH = '/api/maintenance_window';
export const ARCHIVE_MAINTENANCE_WINDOW_API_PATH = `${BASE_MAINTENANCE_WINDOW_API_PATH}/{id}/_archive`;
export const UNARCHIVE_MAINTENANCE_WINDOW_API_PATH = `${BASE_MAINTENANCE_WINDOW_API_PATH}/{id}/_unarchive`;
export const CREATE_MAINTENANCE_WINDOW_API_PATH = BASE_MAINTENANCE_WINDOW_API_PATH;
export const GET_MAINTENANCE_WINDOW_API_PATH = `${BASE_MAINTENANCE_WINDOW_API_PATH}/{id}`;
export const UPDATE_MAINTENANCE_WINDOW_API_PATH = `${BASE_MAINTENANCE_WINDOW_API_PATH}/{id}`;
export const DELETE_MAINTENANCE_WINDOW_API_PATH = `${BASE_MAINTENANCE_WINDOW_API_PATH}/{id}`;
export const FIND_MAINTENANCE_WINDOWS_API_PATH = `${BASE_MAINTENANCE_WINDOW_API_PATH}/_find`;

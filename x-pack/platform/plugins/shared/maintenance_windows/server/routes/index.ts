/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ILicenseState } from '../lib/license_state';
import type { MaintenanceWindowRequestHandlerContext } from '../types';

import { createMaintenanceWindowRoute as createMaintenanceWindowRouteInternal } from './apis/maintenance_window/internal/create/create_maintenance_window_route';
import { getMaintenanceWindowRoute as getMaintenanceWindowRouteInternal } from './apis/maintenance_window/internal/get/get_maintenance_window_route';
import { updateMaintenanceWindowRoute as updateMaintenanceWindowRouteInternal } from './apis/maintenance_window/internal/update/update_maintenance_window_route';
import { deleteMaintenanceWindowRoute as deleteMaintenanceWindowRouteInternal } from './apis/maintenance_window/internal/delete/delete_maintenance_window_route';
import { findMaintenanceWindowsRoute as findMaintenanceWindowsRouteInternal } from './apis/maintenance_window/internal/find/find_maintenance_windows_route';
import { archiveMaintenanceWindowRoute as archiveMaintenanceWindowRouteInternal } from './apis/maintenance_window/internal/archive/archive_maintenance_window_route';
import { finishMaintenanceWindowRoute as finishMaintenanceWindowRouteInternal } from './apis/maintenance_window/internal/finish/finish_maintenance_window_route';
import { getActiveMaintenanceWindowsRoute as getActiveMaintenanceWindowsRouteInternal } from './apis/maintenance_window/internal/get_active/get_active_maintenance_windows_route';
import { bulkGetMaintenanceWindowRoute as bulkGetMaintenanceWindowRouteInternal } from './apis/maintenance_window/internal/bulk_get/bulk_get_maintenance_windows_route';

import { getMaintenanceWindowRoute } from './apis/maintenance_window/external/get/get_maintenance_window_route';
import { createMaintenanceWindowRoute } from './apis/maintenance_window/external/create/create_maintenance_window_route';
import { deleteMaintenanceWindowRoute } from './apis/maintenance_window/external/delete/delete_maintenance_window_route';
import { archiveMaintenanceWindowRoute } from './apis/maintenance_window/external/archive/archive_maintenance_window_route';
import { unarchiveMaintenanceWindowRoute } from './apis/maintenance_window/external/unarchive/unarchive_maintenance_window_route';
import { updateMaintenanceWindowRoute } from './apis/maintenance_window/external/update/update_maintenance_window_route';
import { findMaintenanceWindowsRoute } from './apis/maintenance_window/external/find/find_maintenance_windows_route';

export interface RouteOptions {
  router: IRouter<MaintenanceWindowRequestHandlerContext>;
  licenseState: ILicenseState;
}

export function defineRoutes(opts: RouteOptions) {
  const { router, licenseState } = opts;

  // Internal APIs
  createMaintenanceWindowRouteInternal(router, licenseState);
  getMaintenanceWindowRouteInternal(router, licenseState);
  updateMaintenanceWindowRouteInternal(router, licenseState);
  deleteMaintenanceWindowRouteInternal(router, licenseState);
  findMaintenanceWindowsRouteInternal(router, licenseState);
  archiveMaintenanceWindowRouteInternal(router, licenseState);
  finishMaintenanceWindowRouteInternal(router, licenseState);
  getActiveMaintenanceWindowsRouteInternal(router, licenseState);
  bulkGetMaintenanceWindowRouteInternal(router, licenseState);

  // External APIs
  getMaintenanceWindowRoute(router, licenseState);
  createMaintenanceWindowRoute(router, licenseState);
  deleteMaintenanceWindowRoute(router, licenseState);
  archiveMaintenanceWindowRoute(router, licenseState);
  unarchiveMaintenanceWindowRoute(router, licenseState);
  updateMaintenanceWindowRoute(router, licenseState);
  findMaintenanceWindowsRoute(router, licenseState);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, DocLinksServiceSetup, IRouter } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';
import type { ConfigSchema } from '@kbn/unified-search-plugin/server/config';
import type { Observable } from 'rxjs';
import type { MaintenanceWindowsConfig } from '../config';
import type { ILicenseState } from '../lib/license_state';
import type { MaintenanceWindowRequestHandlerContext } from '../types';

import { createMaintenanceWindowRoute as createMaintenanceWindowRouteInternal } from './apis/internal/create/create_maintenance_window_route';
import { getMaintenanceWindowRoute as getMaintenanceWindowRouteInternal } from './apis/internal/get/get_maintenance_window_route';
import { updateMaintenanceWindowRoute as updateMaintenanceWindowRouteInternal } from './apis/internal/update/update_maintenance_window_route';
import { deleteMaintenanceWindowRoute as deleteMaintenanceWindowRouteInternal } from './apis/internal/delete/delete_maintenance_window_route';
import { findMaintenanceWindowsRoute as findMaintenanceWindowsRouteInternal } from './apis/internal/find/find_maintenance_windows_route';
import { archiveMaintenanceWindowRoute as archiveMaintenanceWindowRouteInternal } from './apis/internal/archive/archive_maintenance_window_route';
import { finishMaintenanceWindowRoute as finishMaintenanceWindowRouteInternal } from './apis/internal/finish/finish_maintenance_window_route';
import { getActiveMaintenanceWindowsRoute as getActiveMaintenanceWindowsRouteInternal } from './apis/internal/get_active/get_active_maintenance_windows_route';
import { bulkGetMaintenanceWindowRoute as bulkGetMaintenanceWindowRouteInternal } from './apis/internal/bulk_get/bulk_get_maintenance_windows_route';

import { getMaintenanceWindowRoute } from './apis/external/get/get_maintenance_window_route';
import { createMaintenanceWindowRoute } from './apis/external/create/create_maintenance_window_route';
import { deleteMaintenanceWindowRoute } from './apis/external/delete/delete_maintenance_window_route';
import { archiveMaintenanceWindowRoute } from './apis/external/archive/archive_maintenance_window_route';
import { unarchiveMaintenanceWindowRoute } from './apis/external/unarchive/unarchive_maintenance_window_route';
import { updateMaintenanceWindowRoute } from './apis/external/update/update_maintenance_window_route';
import { findMaintenanceWindowsRoute } from './apis/external/find/find_maintenance_windows_route';

import type { MaintenanceWindowsPluginsStart } from '../plugin';

export interface RouteOptions {
  router: IRouter<MaintenanceWindowRequestHandlerContext>;
  licenseState: ILicenseState | null;
  maintenanceWindowsConfig: MaintenanceWindowsConfig;
}

export function defineRoutes(opts: RouteOptions) {
  const { router, licenseState, maintenanceWindowsConfig } = opts;

  if (maintenanceWindowsConfig.maintenanceWindow.enabled) {
    // Maintenance Window - Internal APIs
    createMaintenanceWindowRouteInternal(router, licenseState);
    getMaintenanceWindowRouteInternal(router, licenseState);
    updateMaintenanceWindowRouteInternal(router, licenseState);
    deleteMaintenanceWindowRouteInternal(router, licenseState);
    findMaintenanceWindowsRouteInternal(router, licenseState);
    archiveMaintenanceWindowRouteInternal(router, licenseState);
    finishMaintenanceWindowRouteInternal(router, licenseState);
    getActiveMaintenanceWindowsRouteInternal(router, licenseState);
    bulkGetMaintenanceWindowRouteInternal(router, licenseState);

    // Maintenance Window - External APIs
    getMaintenanceWindowRoute(router, licenseState);
    createMaintenanceWindowRoute(router, licenseState);
    deleteMaintenanceWindowRoute(router, licenseState);
    archiveMaintenanceWindowRoute(router, licenseState);
    unarchiveMaintenanceWindowRoute(router, licenseState);
    updateMaintenanceWindowRoute(router, licenseState);
    findMaintenanceWindowsRoute(router, licenseState);
  }
}

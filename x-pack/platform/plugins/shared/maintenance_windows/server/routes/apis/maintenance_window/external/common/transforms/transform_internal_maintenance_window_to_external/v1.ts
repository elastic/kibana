/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindow } from '../../../../../../../application/types';
import type { MaintenanceWindowResponseV1 } from '../../../../../../schemas/maintenance_window/external/response';

/**
 *  This function converts from the internal Maintenance Window type used by the application client,
 *  to the external human readable type used by the public APIs.
 */
export const transformInternalMaintenanceWindowToExternal = (
  maintenanceWindow: MaintenanceWindow
): MaintenanceWindowResponseV1 => {
  const { scope } = maintenanceWindow;

  // External API is lossy (kql only, filters/dsl dropped). Selection is reflected via `enabled`.
  // `query` is always emitted when `alerting` is present to preserve the GA API contract:
  // the v1 response schema requires `alerting.query` to be present. When no kql filter was
  // configured (apply to all alerts), an empty string is used as the default.
  //   scope.alerting present + kql  → { alerting: { enabled, query: { kql } } }
  //   scope.alerting present, no kql → { alerting: { enabled, query: { kql: '' } } }
  //   scope.alerting absent          → alerting key absent (not selected)
  const externalScope =
    scope !== undefined
      ? {
          ...(scope.alerting !== undefined
            ? {
                alerting: {
                  enabled: scope.alerting.enabled,
                  query: { kql: scope.alerting.kql ?? '' },
                },
              }
            : {}),
          ...(scope.alertingV2 !== undefined
            ? {
                alerting_v2: {
                  enabled: scope.alertingV2.enabled,
                  ...(scope.alertingV2.kql ? { query: { kql: scope.alertingV2.kql } } : {}),
                },
              }
            : {}),
        }
      : undefined;

  return {
    id: maintenanceWindow.id,
    title: maintenanceWindow.title,
    enabled: maintenanceWindow.enabled,
    schedule: maintenanceWindow.schedule,
    created_by: maintenanceWindow.createdBy,
    updated_by: maintenanceWindow.updatedBy,
    created_at: maintenanceWindow.createdAt,
    updated_at: maintenanceWindow.updatedAt,
    status: maintenanceWindow.status,
    ...(externalScope !== undefined ? { scope: externalScope } : {}),
  };
};

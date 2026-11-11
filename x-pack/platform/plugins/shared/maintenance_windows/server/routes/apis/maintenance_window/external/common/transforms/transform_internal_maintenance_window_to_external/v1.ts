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

  // Emission rules (restores the main-branch contract, plus v2 support):
  //
  //   v1 enabled, no kql, no v2  →  no `scope` key  (byte-identical to pre-9.1.0)
  //   v1 enabled, kql, no v2     →  scope.alerting.query.kql
  //   v1 disabled OR v2 present  →  full scope object; `alerting` is always present
  //                                  (required by the GA contract) with enabled: false when
  //                                  the window does not apply to alerting v1
  //
  // External API is lossy: only kql is surfaced (filters/dsl are dropped).
  // Use `?? true` so that an absent scope (legacy document) is treated as "v1 applies, no filter"
  // — the same as the pre-9.1.0 default — and does not trigger unnecessary scope emission.
  const alertingEnabled = scope?.alerting?.enabled ?? true;
  const alertingKql = scope?.alerting?.kql;
  const hasV2 = scope?.alertingV2 !== undefined;

  // Omit `scope` entirely for the pre-9.1.0 default (v1 enabled, no filter, no v2) so that
  // existing maintenance windows keep a byte-identical response.
  const needsScope = hasV2 || alertingEnabled === false || Boolean(alertingKql);

  const externalScope = needsScope
    ? {
        alerting: {
          enabled: alertingEnabled,
          query: { kql: alertingKql ?? '' },
        },
        ...(hasV2
          ? {
              alerting_v2: {
                enabled: scope!.alertingV2!.enabled,
                ...(scope!.alertingV2!.kql ? { query: { kql: scope!.alertingV2!.kql } } : {}),
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

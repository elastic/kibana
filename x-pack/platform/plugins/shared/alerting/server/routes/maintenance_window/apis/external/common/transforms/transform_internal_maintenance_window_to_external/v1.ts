/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindowResponseV1 } from '../../../../../../../../common/routes/maintenance_window/external/response';
import type { MaintenanceWindow } from '../../../../../../../application/maintenance_window/types';
import { transformRRuleToCustomScheduleV1 } from '../../../../../../../../common/routes/schedule';

/**
 *  This function converts from the internal Maintenance Window type used by the application client,
 *  to the external human readable type used by the public APIs.
 */
export const transformInternalMaintenanceWindowToExternal = (
  maintenanceWindow: MaintenanceWindow
): MaintenanceWindowResponseV1 => {
  const kql = maintenanceWindow.scopedQuery?.kql;

  const custom = transformRRuleToCustomScheduleV1({
    duration: maintenanceWindow.duration,
    rRule: maintenanceWindow.rRule,
  });

  return {
    id: maintenanceWindow.id,
    title: maintenanceWindow.title,
    enabled: maintenanceWindow.enabled,
    schedule: { custom },
    created_by: maintenanceWindow.createdBy,
    updated_by: maintenanceWindow.updatedBy,
    created_at: maintenanceWindow.createdAt,
    updated_at: maintenanceWindow.updatedAt,
    status: maintenanceWindow.status,
    ...(kql && { scope: { alerting: { query: { kql } } } }),
  };
};

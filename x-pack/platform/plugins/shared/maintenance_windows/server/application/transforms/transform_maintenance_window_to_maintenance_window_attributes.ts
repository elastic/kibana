/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindowAttributes } from '../../data/types/maintenance_window_attributes';
import type { MaintenanceWindowWithoutComputedProperties } from '../types';

export const transformMaintenanceWindowToMaintenanceWindowAttributes = (
  maintenanceWindow: MaintenanceWindowWithoutComputedProperties
): MaintenanceWindowAttributes => {
  return {
    title: maintenanceWindow.title,
    enabled: maintenanceWindow.enabled,
    expirationDate: maintenanceWindow.expirationDate,
    events: maintenanceWindow.events,
    createdBy: maintenanceWindow.createdBy,
    updatedBy: maintenanceWindow.updatedBy,
    createdAt: maintenanceWindow.createdAt,
    updatedAt: maintenanceWindow.updatedAt,
    schedule: maintenanceWindow.schedule,
    ...(maintenanceWindow.scope !== undefined
      ? maintenanceWindow.scope == null
        ? { scope: maintenanceWindow.scope }
        : {
            scope: {
              alerting: {
                filters: maintenanceWindow.scope.alerting?.filters ?? [],
                kql: maintenanceWindow.scope.alerting?.kql ?? '',
                dsl: maintenanceWindow.scope.alerting?.dsl ?? '',
              },
            },
          }
      : {}),
  };
};

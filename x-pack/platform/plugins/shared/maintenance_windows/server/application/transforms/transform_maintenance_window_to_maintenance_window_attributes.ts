/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindowAttributes } from '../../data/types/maintenance_window_attributes';
import { getDurationInMilliseconds } from '../../lib/transforms/custom_to_rrule/util';
import type { MaintenanceWindowWithoutComputedProperties } from '../types';

export const transformMaintenanceWindowToMaintenanceWindowAttributes = (
  maintenanceWindow: MaintenanceWindowWithoutComputedProperties
): MaintenanceWindowAttributes => {
  const durationInMilliseconds = getDurationInMilliseconds(
    maintenanceWindow.schedule.custom.duration
  );

  return {
    title: maintenanceWindow.title,
    enabled: maintenanceWindow.enabled,
    duration: durationInMilliseconds,
    expirationDate: maintenanceWindow.expirationDate,
    events: maintenanceWindow.events,
    rRule: maintenanceWindow.rRule,
    createdBy: maintenanceWindow.createdBy,
    updatedBy: maintenanceWindow.updatedBy,
    createdAt: maintenanceWindow.createdAt,
    updatedAt: maintenanceWindow.updatedAt,
    ...(maintenanceWindow.categoryIds !== undefined
      ? { categoryIds: maintenanceWindow.categoryIds }
      : {}),
    ...(maintenanceWindow.scopedQuery !== undefined
      ? maintenanceWindow?.scopedQuery == null
        ? { scopedQuery: maintenanceWindow?.scopedQuery }
        : {
            scopedQuery: {
              filters: maintenanceWindow?.scopedQuery?.filters ?? [],
              kql: maintenanceWindow?.scopedQuery?.kql ?? '',
              dsl: maintenanceWindow?.scopedQuery?.dsl ?? '',
            },
          }
      : {}),
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

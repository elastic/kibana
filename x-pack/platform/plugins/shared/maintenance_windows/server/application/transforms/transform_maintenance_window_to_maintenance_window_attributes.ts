/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDurationInMilliseconds, transformCustomScheduleToRRule } from '../../../common';
import type { MaintenanceWindowAttributes } from '../../data/types/maintenance_window_attributes';
import type { MaintenanceWindowWithoutComputedProperties } from '../types';

export const transformMaintenanceWindowToMaintenanceWindowAttributes = (
  maintenanceWindow: MaintenanceWindowWithoutComputedProperties
): MaintenanceWindowAttributes => {
  const durationInMilliseconds = getDurationInMilliseconds(
    maintenanceWindow.schedule.custom.duration
  );
  const { rRule } = transformCustomScheduleToRRule(maintenanceWindow.schedule.custom);

  return {
    title: maintenanceWindow.title,
    enabled: maintenanceWindow.enabled,
    duration: durationInMilliseconds,
    expirationDate: maintenanceWindow.expirationDate,
    events: maintenanceWindow.events,
    rRule,
    createdBy: maintenanceWindow.createdBy,
    updatedBy: maintenanceWindow.updatedBy,
    createdAt: maintenanceWindow.createdAt,
    updatedAt: maintenanceWindow.updatedAt,
    schedule: maintenanceWindow.schedule,
    ...(maintenanceWindow.categoryIds !== undefined
      ? { categoryIds: maintenanceWindow.categoryIds }
      : {}),
    ...(maintenanceWindow.scope?.alerting !== undefined
      ? maintenanceWindow?.scope?.alerting == null
        ? { scopedQuery: maintenanceWindow?.scope?.alerting }
        : {
            scopedQuery: {
              filters: maintenanceWindow?.scope?.alerting?.filters ?? [],
              kql: maintenanceWindow?.scope?.alerting?.kql ?? '',
              dsl: maintenanceWindow?.scope?.alerting?.dsl ?? '',
            },
          }
      : {}),
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

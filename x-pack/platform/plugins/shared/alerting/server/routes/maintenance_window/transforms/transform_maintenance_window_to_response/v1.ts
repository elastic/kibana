/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MaintenanceWindowResponseV1 } from '../../../../../common/routes/maintenance_window/response';
import { MaintenanceWindow } from '../../../../application/maintenance_window/types';

export const transformMaintenanceWindowToResponse = (
  maintenanceWindow: MaintenanceWindow
): MaintenanceWindowResponseV1 => {
  return {
    id: maintenanceWindow.id,
    title: maintenanceWindow.title,
    enabled: maintenanceWindow.enabled,
    duration: maintenanceWindow.duration,
    expiration_date: maintenanceWindow.expirationDate,
    events: maintenanceWindow.events,
    r_rule: maintenanceWindow.rRule,
    created_by: maintenanceWindow.createdBy,
    updated_by: maintenanceWindow.updatedBy,
    created_at: maintenanceWindow.createdAt,
    updated_at: maintenanceWindow.updatedAt,
    event_start_time: maintenanceWindow.eventStartTime,
    event_end_time: maintenanceWindow.eventEndTime,
    status: maintenanceWindow.status,
    ...(maintenanceWindow.categoryIds !== undefined
      ? { category_ids: maintenanceWindow.categoryIds }
      : {}),
    ...(maintenanceWindow.scopedQuery !== undefined
      ? { scoped_query: maintenanceWindow.scopedQuery }
      : {}),
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindowResponseV1 } from '../../../../../schemas/maintenance_window/internal/response';
import type { MaintenanceWindow } from '../../../../../../application/types';
import { getDurationInMilliseconds } from '../../../../../../lib/transforms/custom_to_rrule/util';
import { transformCustomScheduleToRRule } from '../../../../../../lib/transforms/custom_to_rrule/v1';

export const transformInternalMaintenanceWindowToExternal = (
  maintenanceWindow: MaintenanceWindow
): MaintenanceWindowResponseV1 => {
  const durationInMilliseconds = getDurationInMilliseconds(
    maintenanceWindow.schedule.custom.duration
  );
  const { rRule } = transformCustomScheduleToRRule(maintenanceWindow.schedule.custom);
  const scopedQuery = maintenanceWindow.scope ? maintenanceWindow.scope.alerting : undefined;

  return {
    id: maintenanceWindow.id,
    title: maintenanceWindow.title,
    enabled: maintenanceWindow.enabled,
    duration: durationInMilliseconds,
    expiration_date: maintenanceWindow.expirationDate,
    events: maintenanceWindow.events,
    r_rule: rRule as unknown as MaintenanceWindowResponseV1['r_rule'],
    created_by: maintenanceWindow.createdBy,
    updated_by: maintenanceWindow.updatedBy,
    created_at: maintenanceWindow.createdAt,
    updated_at: maintenanceWindow.updatedAt,
    event_start_time: maintenanceWindow.eventStartTime,
    event_end_time: maintenanceWindow.eventEndTime,
    status: maintenanceWindow.status,
    ...(scopedQuery !== undefined ? { scoped_query: scopedQuery } : {}),
  };
};

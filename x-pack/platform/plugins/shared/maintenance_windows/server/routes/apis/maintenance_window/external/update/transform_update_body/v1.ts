/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateMaintenanceWindowRequestBodyV1 } from '../../../../../schemas/maintenance_window/external/request/update';
import type { UpdateMaintenanceWindowParams } from '../../../../../../application/methods/update/types';
import { transformCustomScheduleToRRule } from '../../../../../../lib/transforms/custom_to_rrule/latest';
import { getDurationInMilliseconds } from '../../../../../../lib/transforms/custom_to_rrule/util';

/**
 *  This function converts from the external, human readable, Maintenance Window creation/POST
 *  type expected by the public APIs, to the internal type used by the client.
 */
export const transformUpdateBody = (
  updateBody: UpdateMaintenanceWindowRequestBodyV1
): UpdateMaintenanceWindowParams['data'] => {
  const kql = updateBody?.scope?.alerting.query.kql;
  let customSchedule;

  if (updateBody.schedule?.custom) {
    customSchedule = transformCustomScheduleToRRule(updateBody.schedule.custom);
  }
  const durationInMilliseconds = updateBody.schedule?.custom?.duration
    ? getDurationInMilliseconds(updateBody.schedule.custom.duration)
    : undefined;

  return {
    ...(updateBody.title && { title: updateBody.title }),
    ...(updateBody.enabled !== undefined && { enabled: updateBody.enabled }),
    ...(durationInMilliseconds && { duration: durationInMilliseconds }),
    ...(customSchedule?.rRule && { rRule: customSchedule.rRule }),
    ...(kql && { scopedQuery: { kql, filters: [] } }),
    ...(updateBody.schedule && { schedule: updateBody.schedule }),
    ...(kql && { scope: { alerting: { kql, filters: [] } } }),
  };
};

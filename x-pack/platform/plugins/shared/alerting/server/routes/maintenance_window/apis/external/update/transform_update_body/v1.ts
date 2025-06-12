/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateMaintenanceWindowRequestBodyV1 } from '../../../../../../../common/routes/maintenance_window/external/apis/update';
import type { UpdateMaintenanceWindowParams } from '../../../../../../application/maintenance_window/methods/update/types';
import { transformCustomScheduleToRRule } from '../../../../../../../common/routes/schedule';

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

  return {
    ...(updateBody.title && { title: updateBody.title }),
    ...(updateBody.enabled !== undefined && { enabled: updateBody.enabled }),
    ...(customSchedule?.duration && { duration: customSchedule.duration }),
    ...(customSchedule?.rRule && { rRule: customSchedule.rRule }),
    ...(kql && { scopedQuery: { kql, filters: [] } }),
  };
};

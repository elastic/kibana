/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  transformCustomScheduleToRRule,
  getDurationInMilliseconds,
} from '@kbn/response-ops-schedule-schema';
import type { UpdateMaintenanceWindowRequestBodyV1 } from '../../../../../schemas/maintenance_window/external/request/update';
import type { UpdateMaintenanceWindowParams } from '../../../../../../application/methods/update/types';

/**
 *  This function converts from the external, human readable, Maintenance Window creation/POST
 *  type expected by the public APIs, to the internal type used by the client.
 */
export const transformUpdateBody = (
  updateBody: UpdateMaintenanceWindowRequestBodyV1
): UpdateMaintenanceWindowParams['data'] => {
  const requestScope = updateBody.scope;
  let customSchedule;

  if (updateBody.schedule?.custom) {
    customSchedule = transformCustomScheduleToRRule(updateBody.schedule.custom);
  }
  const durationInMilliseconds = updateBody.schedule?.custom?.duration
    ? getDurationInMilliseconds(updateBody.schedule.custom.duration)
    : undefined;

  const alertingKql = requestScope?.alerting?.query?.kql;
  const alertingV2Kql = requestScope?.alerting_v2?.query?.kql;
  const scope =
    requestScope !== undefined
      ? {
          ...(requestScope.alerting !== undefined
            ? {
                alerting: {
                  enabled: requestScope.alerting.enabled ?? true,
                  ...(alertingKql ? { kql: alertingKql, filters: [] } : {}),
                },
              }
            : {}),
          ...(requestScope.alerting_v2 !== undefined
            ? {
                alertingV2: {
                  enabled: requestScope.alerting_v2.enabled ?? true,
                  ...(alertingV2Kql ? { kql: alertingV2Kql } : {}),
                },
              }
            : {}),
        }
      : undefined;

  return {
    ...(updateBody.title && { title: updateBody.title }),
    ...(updateBody.enabled !== undefined && { enabled: updateBody.enabled }),
    ...(durationInMilliseconds && { duration: durationInMilliseconds }),
    ...(customSchedule?.rRule && { rRule: customSchedule.rRule }),
    ...(alertingKql ? { scopedQuery: { kql: alertingKql, filters: [] } } : {}),
    ...(updateBody.schedule && { schedule: updateBody.schedule }),
    ...(scope !== undefined ? { scope } : {}),
  };
};

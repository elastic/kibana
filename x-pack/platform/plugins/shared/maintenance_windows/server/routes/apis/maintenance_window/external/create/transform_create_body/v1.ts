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
import type { CreateMaintenanceWindowRequestBodyV1 } from '../../../../../schemas/maintenance_window/external/request/create';
import type { CreateMaintenanceWindowParams } from '../../../../../../application/methods/create/types';

/**
 *  This function converts from the external, human readable, Maintenance Window creation/POST
 *  type expected by the public APIs, to the internal type used by the client.
 */
export const transformCreateBody = (
  createBody: CreateMaintenanceWindowRequestBodyV1
): CreateMaintenanceWindowParams['data'] => {
  const { rRule } = transformCustomScheduleToRRule(createBody.schedule.custom);
  const duration = getDurationInMilliseconds(createBody.schedule.custom.duration);
  const requestScope = createBody.scope;

  // External API scope → internal scope. `enabled` defaults to true when the sub-object is present.
  // Back-compat: omitting scope entirely is handled by `create_maintenance_window.ts`
  // (defaults to `{ alerting: { enabled: true } }`).
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
    title: createBody.title,
    enabled: createBody.enabled,
    // scopedQuery mirrors scope.alerting for the v1 alerting consumer and telemetry.
    // Domain AlertsFilterQueryAttributes has no `enabled` field — drop it here.
    ...(alertingKql ? { scopedQuery: { kql: alertingKql, filters: [] } } : {}),
    ...(scope !== undefined ? { scope } : {}),
    duration,
    schedule: createBody.schedule,
    rRule,
  };
};

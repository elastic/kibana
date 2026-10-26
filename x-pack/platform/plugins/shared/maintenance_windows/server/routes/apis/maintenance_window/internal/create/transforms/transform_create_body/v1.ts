/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRRuleToCustomSchedule } from '@kbn/response-ops-schedule-schema';
import type { CreateMaintenanceWindowRequestBodyV1 } from '../../../../../../schemas/maintenance_window/internal/request/create';
import type { CreateMaintenanceWindowParams } from '../../../../../../../application/methods/create/types';

export const transformCreateBody = (
  createBody: CreateMaintenanceWindowRequestBodyV1
): CreateMaintenanceWindowParams['data'] => {
  const schedule = transformRRuleToCustomSchedule({
    rRule: createBody.r_rule,
    duration: createBody.duration,
  });
  // Pass scope through from the request body. The application layer applies defaults and
  // validation. scopedQuery is kept for back-compat with existing callers that only send it.
  // `enabled` is optional in the route schema (defaultValue: true) for back-compat; coerce here.
  const rawScopedQuery = createBody.scoped_query;
  // Drop `enabled` from scopedQuery: the domain AlertsFilterQueryAttributes does not have that
  // field — it is a legacy storage field. The scope.alerting field carries enabled in the domain.
  const scopedQuery = rawScopedQuery
    ? {
        kql: rawScopedQuery.kql ?? '',
        filters: rawScopedQuery.filters ?? [],
        dsl: rawScopedQuery.dsl,
      }
    : rawScopedQuery;
  const scope = createBody.scope;
  return {
    title: createBody.title,
    duration: createBody.duration,
    rRule: createBody.r_rule,
    categoryIds: createBody.category_ids,
    scopedQuery,
    schedule: { custom: schedule },
    ...(scope !== undefined
      ? {
          scope: {
            ...(scope.alerting !== undefined
              ? { alerting: { ...scope.alerting, enabled: scope.alerting.enabled ?? true } }
              : {}),
            ...(scope.alerting_v2 !== undefined ? { alertingV2: scope.alerting_v2 } : {}),
          },
        }
      : scopedQuery != null
      ? {
          scope: {
            alerting: { enabled: true, kql: scopedQuery.kql, filters: scopedQuery.filters },
          },
        }
      : {}),
  };
};

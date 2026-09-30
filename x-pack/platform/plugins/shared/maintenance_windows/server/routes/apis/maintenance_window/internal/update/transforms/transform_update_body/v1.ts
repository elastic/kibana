/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRRuleToCustomSchedule } from '@kbn/response-ops-schedule-schema';
import type { UpdateMaintenanceWindowRequestBodyV1 } from '../../../../../../schemas/maintenance_window/internal/request/update';
import type { UpdateMaintenanceWindowParams } from '../../../../../../../application/methods/update/types';

export const transformUpdateBody = (
  updateBody: UpdateMaintenanceWindowRequestBodyV1
): UpdateMaintenanceWindowParams['data'] => {
  const {
    title,
    enabled,
    duration,
    r_rule: rRule,
    category_ids: categoryIds,
    scoped_query: rawScopedQuery,
    scope,
  } = updateBody;

  // Drop `enabled` from scopedQuery: the domain AlertsFilterQueryAttributes does not have that
  // field — it is a legacy storage field. The scope.alerting field carries enabled in the domain.
  const scopedQuery = rawScopedQuery
    ? {
        kql: rawScopedQuery.kql ?? '',
        filters: rawScopedQuery.filters ?? [],
        dsl: rawScopedQuery.dsl,
      }
    : rawScopedQuery;

  const schedule =
    rRule && duration
      ? transformRRuleToCustomSchedule({
          rRule,
          duration,
        })
      : undefined;

  // Determine scope to forward. Explicit `scope` from body takes precedence over legacy
  // `scoped_query`; when neither is provided, omit scope so the stored value is kept.
  // `scoped_query: null` means "clear the KQL filter but keep v1 alerting enabled for all alerts".
  const resolvedScope =
    scope !== undefined
      ? {
          ...(scope.alerting !== undefined
            ? { alerting: { ...scope.alerting, enabled: scope.alerting.enabled ?? true } }
            : {}),
          ...(scope.alerting_v2 !== undefined ? { alertingV2: scope.alerting_v2 } : {}),
        }
      : rawScopedQuery === null
      ? { alerting: { enabled: true } }
      : scopedQuery != null
      ? { alerting: { enabled: true, kql: scopedQuery.kql, filters: scopedQuery.filters } }
      : undefined;

  return {
    ...(title !== undefined ? { title } : {}),
    ...(enabled !== undefined ? { enabled } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...(rRule !== undefined ? { rRule } : {}),
    ...(categoryIds !== undefined ? { categoryIds } : {}),
    ...(scopedQuery !== undefined ? { scopedQuery } : {}),
    ...(schedule !== undefined ? { schedule: { custom: schedule } } : {}),
    ...(resolvedScope !== undefined ? { scope: resolvedScope } : {}),
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertsFilterQueryAttributes,
  AlertingV2ScopeAttributes,
} from '../../data/types/alerts_filter_query_attributes';
import type { MaintenanceWindowAttributes } from '../../data/types/maintenance_window_attributes';
import { getDurationInMilliseconds } from '../../lib/transforms/custom_to_rrule/util';
import type { MaintenanceWindowWithoutComputedProperties } from '../types';

type AlertsFilterQueryInput = NonNullable<
  MaintenanceWindowWithoutComputedProperties['scopedQuery']
>;
type ScopeInput = NonNullable<MaintenanceWindowWithoutComputedProperties['scope']>;
type AlertingV2ScopeInput = NonNullable<ScopeInput['alertingV2']>;
type ScopeAttributes = NonNullable<MaintenanceWindowAttributes['scope']>;

const normalizeAlertsFilterQuery = (
  query: AlertsFilterQueryInput
): AlertsFilterQueryAttributes => ({
  filters: query.filters ?? [],
  kql: query.kql ?? '',
  dsl: query.dsl ?? '',
});

const normalizeAlertingV2Scope = (scope: AlertingV2ScopeInput): AlertingV2ScopeAttributes => ({
  kql: scope.kql ?? '',
});

// Tri-state spread used to model partial updates against the saved object:
//   undefined → omit the field (preserve the existing stored value)
//   null      → set the field to null (intentional clearing)
//   value     → set the field to transform(value)
const partialField = <K extends string, V, R>(
  key: K,
  value: V | null | undefined,
  transform: (v: V) => R
): { [P in K]?: R | null } => {
  if (value === undefined) return {};
  if (value === null) return { [key]: null } as { [P in K]: null };
  return { [key]: transform(value) } as { [P in K]: R };
};

const transformScope = (scope: ScopeInput): ScopeAttributes => ({
  ...partialField('alerting', scope.alerting, normalizeAlertsFilterQuery),
  ...partialField('alertingV2', scope.alertingV2, normalizeAlertingV2Scope),
});

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
    schedule: maintenanceWindow.schedule,
    ...(maintenanceWindow.categoryIds !== undefined
      ? { categoryIds: maintenanceWindow.categoryIds }
      : {}),
    ...partialField('scopedQuery', maintenanceWindow.scopedQuery, normalizeAlertsFilterQuery),
    ...(maintenanceWindow.scope !== undefined
      ? { scope: transformScope(maintenanceWindow.scope) }
      : {}),
  };
};

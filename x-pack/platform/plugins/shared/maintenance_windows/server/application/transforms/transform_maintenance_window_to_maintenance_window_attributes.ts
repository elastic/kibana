/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDurationInMilliseconds } from '@kbn/response-ops-schedule-schema';
import type {
  AlertsFilterQueryAttributes,
  AlertingV2ScopeAttributes,
} from '../../data/types/alerts_filter_query_attributes';
import type { MaintenanceWindowAttributes } from '../../data/types/maintenance_window_attributes';
import type { MaintenanceWindowWithoutComputedProperties } from '../types';

type AlertsFilterQueryInput = NonNullable<
  MaintenanceWindowWithoutComputedProperties['scopedQuery']
>;
type ScopeInput = NonNullable<MaintenanceWindowWithoutComputedProperties['scope']>;
type ScopeAttributes = NonNullable<MaintenanceWindowAttributes['scope']>;

// Normalize the legacy scopedQuery field (telemetry mirror). Still requires non-optional kql/filters/dsl.
const normalizeScopedQuery = (
  query: AlertsFilterQueryInput
): AlertsFilterQueryAttributes => ({
  enabled: true,
  filters: query.filters ?? [],
  kql: query.kql ?? '',
  dsl: query.dsl ?? '',
});

// Scope fields already carry `enabled` and optional kql/filters/dsl — pass through as-is.
const transformScope = (scope: ScopeInput): ScopeAttributes => ({
  ...(scope.alerting !== undefined ? { alerting: scope.alerting as AlertsFilterQueryAttributes } : {}),
  ...(scope.alertingV2 !== undefined ? { alertingV2: scope.alertingV2 as AlertingV2ScopeAttributes } : {}),
});

// Tri-state spread used only for the legacy scopedQuery field (which retains | null).
const partialField = <K extends string, V, R>(
  key: K,
  value: V | null | undefined,
  transform: (v: V) => R
): { [P in K]?: R | null } => {
  if (value === undefined) return {};
  if (value === null) return { [key]: null } as { [P in K]: null };
  return { [key]: transform(value) } as { [P in K]: R };
};

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
    ...(maintenanceWindow.categoryIds !== undefined
      ? { categoryIds: maintenanceWindow.categoryIds }
      : {}),
    ...partialField('scopedQuery', maintenanceWindow.scopedQuery, normalizeScopedQuery),
    schedule: maintenanceWindow.schedule,
    ...(maintenanceWindow.scope !== undefined
      ? { scope: transformScope(maintenanceWindow.scope) }
      : {}),
  };
};

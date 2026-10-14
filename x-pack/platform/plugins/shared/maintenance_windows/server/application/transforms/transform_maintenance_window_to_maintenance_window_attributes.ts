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

// Normalize the legacy scopedQuery field (telemetry mirror). Kept at the shipped MV4 shape
// (kql/filters/dsl required, no `enabled`) so the raw-attribute telemetry reader works correctly.
const normalizeScopedQuery = (query: AlertsFilterQueryInput): AlertsFilterQueryAttributes => ({
  filters: query.filters ?? [],
  kql: query.kql ?? '',
  dsl: query.dsl ?? '',
});

const hasFilter = (a?: { kql?: string; filters?: unknown[] }) =>
  Boolean(a?.kql || a?.filters?.length);

/**
 * Encodes the domain-layer scope into the MV5 on-disk shape.
 *
 * Sibling-flag encoding is used (not `alerting.enabled`) because:
 *  1. MV4's forwardCompatibility schema requires `kql` + `filters` inside `alerting`,
 *     so adding `enabled` there would cause MV4 nodes to reject every MV5 document.
 *  2. main's `filterMaintenanceWindows` buckets on `scope.alerting` truthiness — putting a
 *     non-null object there for an unfiltered window would silently move it to the scoped
 *     bucket, where `LegacyAlertsClient` has no handler and notifications would fire during
 *     the maintenance window.
 */
const transformScope = (scope: ScopeInput): ScopeAttributes => {
  const { alerting, alertingV2 } = scope;
  const alertingEnabled = alerting?.enabled === true;

  return {
    alertingEnabled,
    // MV4 shape: null when v1 is unselected or has no filter, object when filtered.
    alerting:
      alertingEnabled && hasFilter(alerting)
        ? {
            kql: alerting!.kql ?? '',
            filters: alerting!.filters ?? [],
            dsl: alerting!.dsl ?? '',
          }
        : null,
    ...(alertingV2 !== undefined ? { alertingV2: alertingV2 as AlertingV2ScopeAttributes } : {}),
  };
};

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
    // Always encode scope: the domain model always provides it (decodeScope guarantees it).
    scope: transformScope(maintenanceWindow.scope ?? { alerting: { enabled: true } }),
  };
};

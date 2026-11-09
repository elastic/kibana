/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaintenanceWindowAttributes } from '../../data/types/maintenance_window_attributes';
import type { MaintenanceWindow } from '../types';

type Scope = NonNullable<MaintenanceWindow['scope']>;

/**
 * Normalizes every on-disk `scope` shape into the domain model:
 *  - Pre-MV5 documents (no `alertingEnabled` flag): treat v1 as enabled with any existing filter.
 *  - MV5 documents: read the flag; decode `alerting` only when `alertingEnabled` is true.
 *  - Documents written by a node rolled back to MV4 (flag lost): same as pre-MV5.
 *
 * This function must always return an object (never `undefined`) so that `filterMaintenanceWindows`
 * in `get_maintenance_windows.ts` can read `scope.alerting.enabled` on every document, including
 * legacy ones that never had `scope.alertingEnabled` written to disk.
 */
export const decodeScope = (rawScope: MaintenanceWindowAttributes['scope']): Scope => {
  const { alertingEnabled, alerting, alertingV2 } = rawScope ?? {};

  // No flag → pre-MV5 document or one written by a rolled-back MV4 node.
  // Both meanings are "alerting v1 applies", so default to true.
  const enabled = alertingEnabled ?? true;

  // Absorb the MV4 empty-filter bug ({ kql: '', filters: [], dsl: '' }) by treating an empty
  // filter as "no filter". This also handles `alerting: null` (unfiltered v1 in MV4).
  const filter =
    alerting && (alerting.kql || alerting.filters?.length)
      ? { kql: alerting.kql, filters: alerting.filters, dsl: alerting.dsl }
      : undefined;

  return {
    alerting: { enabled, ...filter },
    ...(alertingV2 !== undefined ? { alertingV2 } : {}),
  };
};

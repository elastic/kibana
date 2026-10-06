/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KI_LIFECYCLE_STATUSES, type KiLifecycleStatus } from './step_types/ki';

/** Default list filter: current, recallable KIs (excludes tombstoned memories). */
export const DEFAULT_KI_LIST_LIFECYCLE_STATUSES: KiLifecycleStatus[] = ['active'];

export const DEFAULT_KI_LIST_LIFECYCLE_STATUSES_QUERY = 'active';

const isKiLifecycleStatus = (value: string): value is KiLifecycleStatus =>
  (KI_LIFECYCLE_STATUSES as readonly string[]).includes(value);

/** Parses the `lifecycle_status` list query param (comma-separated). */
export const parseKiListLifecycleStatusesQuery = (value: string): KiLifecycleStatus[] => {
  const statuses = [
    ...new Set(
      value
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
    ),
  ];
  if (statuses.length === 0) {
    return DEFAULT_KI_LIST_LIFECYCLE_STATUSES;
  }
  const parsed: KiLifecycleStatus[] = [];
  for (const status of statuses) {
    if (!isKiLifecycleStatus(status)) {
      throw new Error(`Invalid lifecycle status '${status}'`);
    }
    parsed.push(status);
  }
  return parsed;
};

export const formatKiListLifecycleStatusesQuery = (statuses: KiLifecycleStatus[]): string =>
  [...new Set(statuses)].join(',');

/** Include tombstoned KIs (for example after forget). */
export const KI_LIST_ACTIVE_AND_DELETED_LIFECYCLE_STATUSES: KiLifecycleStatus[] = [
  'active',
  'deleted',
];

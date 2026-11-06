/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '@kbn/cases-components/src/status/types';
import { getStatusConfiguration } from '@kbn/cases-components/src/status/config';
import type { CaseStatusConfiguration, CaseStatusesConfiguration } from '../types/domain';

export const CASE_STATUS_CATEGORIES: CaseStatuses[] = [
  CaseStatuses.open,
  CaseStatuses['in-progress'],
  CaseStatuses.closed,
];

export const getBuiltInStatuses = (): CaseStatusesConfiguration => {
  const config = getStatusConfiguration();
  return CASE_STATUS_CATEGORIES.map((category, order) => ({
    key: category,
    label: config[category].label,
    category,
    order,
    isDefault: true,
    disabled: false,
  }));
};

/**
 * The configured statuses in display order, or the built-in ones when nothing is configured.
 */
export const getEffectiveStatuses = (
  statuses?: CaseStatusesConfiguration | null
): CaseStatusesConfiguration =>
  statuses && statuses.length > 0
    ? [...statuses].sort((a, b) => a.order - b.order)
    : getBuiltInStatuses();

export const getDefaultStatus = (
  statuses: CaseStatusesConfiguration,
  category: CaseStatuses
): CaseStatusConfiguration | undefined =>
  statuses.find((status) => status.category === category && status.isDefault);

/** Seeded into a configuration the first time one of its statuses pauses time tracking. */
export const DEFAULT_CASE_PAUSE_REASONS = [
  'Awaiting customer',
  'Awaiting vendor',
  'Awaiting another team',
  'Scheduled work',
] as const;

/**
 * Keys of the enabled statuses that pause time tracking. Only the public `find` filters by
 * them, so a configuration without any yields an empty list and callers skip the count.
 */
export const getPausingStatusKeys = (statuses: CaseStatusesConfiguration): string[] =>
  statuses
    .filter((status) => status.pausesTimeTracking && !status.disabled)
    .map((status) => status.key);

export const findStatusByKey = (
  statuses: CaseStatusesConfiguration,
  key: string
): CaseStatusConfiguration | undefined => statuses.find((status) => status.key === key);

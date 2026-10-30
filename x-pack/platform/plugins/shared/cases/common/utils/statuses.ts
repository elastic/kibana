/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CaseStatuses } from '@kbn/cases-components/src/status/types';
import type {
  CaseStatusCategory,
  CaseStatusDefinition,
  CasesSpaceSettings,
} from '../types/domain/space_settings/v1';
import { CASE_STATUS_CATEGORIES } from '../constants/statuses';

export const CATEGORY_TO_STATUS: Record<CaseStatusCategory, CaseStatuses> = {
  not_started: CaseStatuses.open,
  active: CaseStatuses['in-progress'],
  done: CaseStatuses.closed,
};

export const STATUS_TO_CATEGORY: Record<CaseStatuses, CaseStatusCategory> = {
  [CaseStatuses.open]: 'not_started',
  [CaseStatuses['in-progress']]: 'active',
  [CaseStatuses.closed]: 'done',
};

/**
 * Seeded for every space. Their keys equal the legacy `status` values, so existing cases (which
 * have no `status_key`) resolve to them. Admins can rename, recolor, reorder, and disable them.
 */
export const DEFAULT_CASE_STATUSES: readonly CaseStatusDefinition[] = [
  {
    key: CaseStatuses.open,
    label: i18n.translate('xpack.cases.statuses.default.open', { defaultMessage: 'Open' }),
    color: 'success',
    category: 'not_started',
    order: 0,
    isDefault: true,
    disabled: false,
  },
  {
    key: CaseStatuses['in-progress'],
    label: i18n.translate('xpack.cases.statuses.default.inProgress', {
      defaultMessage: 'In progress',
    }),
    color: 'primary',
    category: 'active',
    order: 1,
    isDefault: true,
    disabled: false,
  },
  {
    key: CaseStatuses.closed,
    label: i18n.translate('xpack.cases.statuses.default.closed', { defaultMessage: 'Closed' }),
    color: 'default',
    category: 'done',
    order: 2,
    isDefault: true,
    disabled: false,
  },
];

/** The space's statuses in admin order, or the seeded defaults when the space never saved any. */
export const getEffectiveStatuses = (
  settings: CasesSpaceSettings | null | undefined
): CaseStatusDefinition[] =>
  [...(settings?.statuses?.length ? settings.statuses : DEFAULT_CASE_STATUSES)].sort(
    (a, b) => a.order - b.order
  );

export const findStatus = (
  statuses: readonly CaseStatusDefinition[],
  key: string | null | undefined
): CaseStatusDefinition | undefined =>
  key == null ? undefined : statuses.find((status) => status.key === key);

export const getDefaultStatus = (
  statuses: readonly CaseStatusDefinition[],
  category: CaseStatusCategory
): CaseStatusDefinition =>
  statuses.find((status) => status.category === category && status.isDefault && !status.disabled) ??
  // Validation keeps an enabled default per category; seeded defaults cover corrupt data.
  DEFAULT_CASE_STATUSES.find((status) => status.category === category) ??
  DEFAULT_CASE_STATUSES[0];

/**
 * The status a case is in. Cases written before custom statuses have no `status_key` and read as
 * their category's default status.
 */
export const getCaseStatus = (
  statuses: readonly CaseStatusDefinition[],
  { status, statusKey }: { status: CaseStatuses; statusKey?: string | null }
): CaseStatusDefinition => {
  const found = findStatus(statuses, statusKey);
  // A key from elsewhere (e.g. a case imported from another space) may name a status of another
  // category here; the persisted category wins.
  return found && CATEGORY_TO_STATUS[found.category] === status
    ? found
    : getDefaultStatus(statuses, STATUS_TO_CATEGORY[status]);
};

export class StatusWriteError extends Error {}

/**
 * Turns a status write into the persisted pair. A `status_key` sets `status` to its category; a
 * `status` alone moves to its category's default unless the case is already in that category.
 */
export const resolveStatusWrite = ({
  statuses,
  status,
  statusKey,
  current,
}: {
  statuses: readonly CaseStatusDefinition[];
  status?: CaseStatuses;
  statusKey?: string | null;
  current?: { status: CaseStatuses; statusKey?: string | null };
}): { status: CaseStatuses; status_key: string } | undefined => {
  if (statusKey != null) {
    const target = findStatus(statuses, statusKey);
    if (!target) {
      throw new StatusWriteError(`Status "${statusKey}" does not exist in this space.`);
    }
    const currentKey = current ? getCaseStatus(statuses, current).key : undefined;
    if (target.disabled && target.key !== currentKey) {
      throw new StatusWriteError(`Status "${target.label}" is disabled.`);
    }
    const targetStatus = CATEGORY_TO_STATUS[target.category];
    if (status != null && status !== targetStatus) {
      throw new StatusWriteError(
        `Status "${target.label}" is a ${target.category} status, which does not match status "${status}".`
      );
    }
    return { status: targetStatus, status_key: target.key };
  }

  if (status == null) {
    return undefined;
  }

  if (current && current.status === status) {
    return { status, status_key: getCaseStatus(statuses, current).key };
  }

  return { status, status_key: getDefaultStatus(statuses, STATUS_TO_CATEGORY[status]).key };
};

/** Problems with a statuses list an admin wants to save, as user-facing messages. */
export const validateStatuses = (
  next: readonly CaseStatusDefinition[],
  previous: readonly CaseStatusDefinition[]
): string[] => {
  const errors: string[] = [];
  const keys = new Set<string>();
  const labels = new Set<string>();

  for (const status of next) {
    if (keys.has(status.key)) {
      errors.push(`The key "${status.key}" is used by more than one status.`);
    }
    keys.add(status.key);
    const label = status.label.trim().toLowerCase();
    if (labels.has(label)) {
      errors.push(`The name "${status.label}" is used by more than one status.`);
    }
    labels.add(label);
    if (status.isDefault && status.disabled) {
      errors.push(`"${status.label}" is a default status, so it cannot be disabled.`);
    }
  }

  for (const category of CASE_STATUS_CATEGORIES) {
    const defaults = next.filter((status) => status.category === category && status.isDefault);
    if (defaults.length !== 1) {
      errors.push(`Choose exactly one default status for the ${category} category.`);
    }
  }

  for (const saved of previous) {
    const kept = next.find((status) => status.key === saved.key);
    if (!kept) {
      errors.push(`"${saved.label}" cannot be deleted. Disable it instead.`);
    } else if (kept.category !== saved.category) {
      errors.push(`The category of "${saved.label}" cannot change.`);
    }
  }

  return errors;
};

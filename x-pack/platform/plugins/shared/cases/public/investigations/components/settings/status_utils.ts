/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_CASE_PAUSE_REASONS,
  MAX_CASE_STATUS_KEY_LENGTH,
} from '../../../../common/investigations/statuses';
import type { CaseStatusConfiguration } from '../../../../common/investigations/statuses';
import type { InvestigationStatus } from '../../../../common/investigations/types';

export type MoveDirection = 'up' | 'down';

/** The pair the settings page saves in one request. */
export interface StatusesDraft {
  statuses: CaseStatusConfiguration[];
  pauseReasons: string[];
}

export const sortByOrder = (statuses: CaseStatusConfiguration[]): CaseStatusConfiguration[] =>
  [...statuses].sort((a, b) => a.order - b.order);

/** Gives every status an `order` equal to its position in the list. */
export const reindex = (statuses: CaseStatusConfiguration[]): CaseStatusConfiguration[] =>
  statuses.map((status, order) => ({ ...status, order }));

const randomSuffix = (): string => Math.random().toString(16).slice(2, 10).padEnd(8, '0');

/** Slug of the label (`a-z0-9_`), made unique with `_2`, `_3`, and a random key when empty. */
export const generateStatusKey = (label: string, existingKeys: string[]): string => {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_CASE_STATUS_KEY_LENGTH - 4);
  const base = slug.length > 0 ? slug : `status_${randomSuffix()}`;
  if (!existingKeys.includes(base)) {
    return base;
  }
  let counter = 2;
  while (existingKeys.includes(`${base}_${counter}`)) {
    counter += 1;
  }
  return `${base}_${counter}`;
};

export const getCategoryStatuses = (
  statuses: CaseStatusConfiguration[],
  category: InvestigationStatus
): CaseStatusConfiguration[] =>
  sortByOrder(statuses).filter((status) => status.category === category);

/** Swaps the status with its nearest enabled neighbour in the same category. */
export const moveStatus = (
  statuses: CaseStatusConfiguration[],
  key: string,
  direction: MoveDirection
): CaseStatusConfiguration[] => {
  const sorted = sortByOrder(statuses);
  const status = sorted.find((candidate) => candidate.key === key);
  if (!status) {
    return statuses;
  }
  const enabled = sorted.filter(
    (candidate) => candidate.category === status.category && !candidate.disabled
  );
  const index = enabled.findIndex((candidate) => candidate.key === key);
  const neighbour = enabled[direction === 'up' ? index - 1 : index + 1];
  if (!neighbour) {
    return statuses;
  }
  const next = [...sorted];
  const from = next.indexOf(status);
  const to = next.indexOf(neighbour);
  next[from] = neighbour;
  next[to] = status;
  return reindex(next);
};

/** Makes the status the only default of its category. */
export const setDefaultStatus = (
  statuses: CaseStatusConfiguration[],
  key: string
): CaseStatusConfiguration[] => {
  const target = statuses.find((status) => status.key === key);
  if (!target) {
    return statuses;
  }
  return statuses.map((status) =>
    status.category === target.category ? { ...status, isDefault: status.key === key } : status
  );
};

export const hasPausingStatus = (statuses: CaseStatusConfiguration[]): boolean =>
  statuses.some((status) => status.pausesTimeTracking && !status.disabled);

/** A first pausing status brings the default pause reasons with it, as in Cases. */
export const withSeededPauseReasons = (draft: StatusesDraft): StatusesDraft =>
  hasPausingStatus(draft.statuses) && draft.pauseReasons.length === 0
    ? { ...draft, pauseReasons: [...DEFAULT_CASE_PAUSE_REASONS] }
    : draft;

/** True when another status of the category has the label, ignoring case and spaces. */
export const isLabelTaken = (
  statuses: CaseStatusConfiguration[],
  category: InvestigationStatus,
  label: string,
  ignoreKey?: string
): boolean => {
  const normalized = label.trim().toLowerCase();
  return statuses.some(
    (status) =>
      status.category === category &&
      status.key !== ignoreKey &&
      status.label.trim().toLowerCase() === normalized
  );
};

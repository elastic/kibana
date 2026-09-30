/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { MAX_CASE_STATUS_KEY_LENGTH } from '../../../../common/constants';
import type {
  CaseStatusConfiguration,
  CaseStatusesConfiguration,
} from '../../../../common/types/domain';
import { getEffectiveStatuses } from '../../../../common/utils/statuses';

/**
 * A readable API key derived from the label, unique among the existing keys. Labels without
 * latin characters fall back to a generated id so the key is never empty.
 */
export const generateStatusKey = (label: string, existingKeys: string[]): string => {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_CASE_STATUS_KEY_LENGTH);
  const base = slug.length > 0 ? slug : `status_${uuidv4().slice(0, 8)}`;

  let key = base;
  for (let suffix = 2; existingKeys.includes(key); suffix++) {
    key = `${base.slice(0, MAX_CASE_STATUS_KEY_LENGTH - `_${suffix}`.length)}_${suffix}`;
  }

  return key;
};

const reindex = (statuses: CaseStatusesConfiguration): CaseStatusesConfiguration =>
  statuses.map((status, order) => ({ ...status, order }));

export const upsertStatus = (
  statuses: CaseStatusesConfiguration,
  status: CaseStatusConfiguration
): CaseStatusesConfiguration => {
  const current = getEffectiveStatuses(statuses);
  const index = current.findIndex((item) => item.key === status.key);

  return reindex(
    index === -1
      ? [...current, status]
      : current.map((item, itemIndex) => (itemIndex === index ? status : item))
  );
};

/** Swaps the status with its neighbor of the same category; a no-op at the edges. */
export const moveStatus = (
  statuses: CaseStatusesConfiguration,
  key: string,
  direction: 'up' | 'down'
): CaseStatusesConfiguration => {
  const current = getEffectiveStatuses(statuses);
  const index = current.findIndex((item) => item.key === key);

  if (index === -1) {
    return current;
  }

  const step = direction === 'up' ? -1 : 1;
  let neighbor = index + step;
  while (neighbor >= 0 && neighbor < current.length) {
    if (current[neighbor].category === current[index].category) {
      const reordered = [...current];
      [reordered[index], reordered[neighbor]] = [reordered[neighbor], reordered[index]];
      return reindex(reordered);
    }
    neighbor += step;
  }

  return current;
};

export const setDefaultStatus = (
  statuses: CaseStatusesConfiguration,
  key: string
): CaseStatusesConfiguration => {
  const current = getEffectiveStatuses(statuses);
  const target = current.find((item) => item.key === key);

  if (!target) {
    return current;
  }

  return current.map((item) =>
    item.category === target.category ? { ...item, isDefault: item.key === key } : item
  );
};

export const toggleStatusDisabled = (
  statuses: CaseStatusesConfiguration,
  key: string
): CaseStatusesConfiguration =>
  getEffectiveStatuses(statuses).map((item) =>
    item.key === key ? { ...item, disabled: !item.disabled } : item
  );

/** Whether the row can be disabled: never the default, never the last enabled one. */
export const getDisableBlocker = (
  statuses: CaseStatusesConfiguration,
  status: CaseStatusConfiguration
): 'default' | 'last' | undefined => {
  if (status.isDefault) {
    return 'default';
  }

  const enabledInCategory = statuses.filter(
    (item) => item.category === status.category && !item.disabled
  );

  return enabledInCategory.length <= 1 ? 'last' : undefined;
};

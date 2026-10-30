/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_CASE_STATUS_KEY_LENGTH } from '../../../../common/constants';
import type { CaseStatusCategory, CaseStatusDefinition } from '../../../../common/types/domain';

const FALLBACK_KEY = 'status';

/** Numbers the statuses in list order. */
const withOrder = (statuses: CaseStatusDefinition[]): CaseStatusDefinition[] =>
  statuses.map((status, order) => ({ ...status, order }));

/**
 * A key for a new status: the label in lowercase with anything outside a-z, 0-9, `_`, and `-`
 * turned into `_`, made unique with a numeric suffix.
 */
export const generateStatusKey = (label: string, takenKeys: readonly string[]): string => {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, MAX_CASE_STATUS_KEY_LENGTH) || FALLBACK_KEY;

  const taken = new Set(takenKeys);
  if (!taken.has(base)) {
    return base;
  }

  for (let suffix = 2; ; suffix++) {
    const ending = `_${suffix}`;
    const candidate = `${base.slice(0, MAX_CASE_STATUS_KEY_LENGTH - ending.length)}${ending}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
};

export interface NewStatus {
  label: string;
  color: CaseStatusDefinition['color'];
  category: CaseStatusCategory;
}

/** Adds a status at the end of the list. */
export const addStatus = (
  statuses: CaseStatusDefinition[],
  { label, color, category }: NewStatus
): CaseStatusDefinition[] =>
  withOrder([
    ...statuses,
    {
      key: generateStatusKey(
        label,
        statuses.map((status) => status.key)
      ),
      label: label.trim(),
      color,
      category,
      order: statuses.length,
      isDefault: false,
      disabled: false,
    },
  ]);

/** Changes the label and color of a status. Its key and category never change. */
export const updateStatus = (
  statuses: CaseStatusDefinition[],
  key: string,
  { label, color }: Pick<NewStatus, 'label' | 'color'>
): CaseStatusDefinition[] =>
  statuses.map((status) =>
    status.key === key ? { ...status, label: label.trim(), color } : status
  );

/** Swaps a status with its enabled neighbor, so it moves one place in the enabled list. */
export const moveStatus = (
  statuses: CaseStatusDefinition[],
  key: string,
  direction: 'up' | 'down'
): CaseStatusDefinition[] => {
  const index = statuses.findIndex((status) => status.key === key);
  if (index === -1) {
    return statuses;
  }

  const step = direction === 'up' ? -1 : 1;
  let neighbor = index + step;
  while (neighbor >= 0 && neighbor < statuses.length && statuses[neighbor].disabled) {
    neighbor += step;
  }

  if (neighbor < 0 || neighbor >= statuses.length) {
    return statuses;
  }

  const next = [...statuses];
  [next[index], next[neighbor]] = [next[neighbor], next[index]];
  return withOrder(next);
};

/** Makes a status the default of its category. */
export const setDefaultStatus = (
  statuses: CaseStatusDefinition[],
  key: string
): CaseStatusDefinition[] => {
  const target = statuses.find((status) => status.key === key);
  if (target == null) {
    return statuses;
  }

  return statuses.map((status) =>
    status.category === target.category ? { ...status, isDefault: status.key === key } : status
  );
};

/** Disables an enabled status or enables a disabled one. */
export const toggleStatusDisabled = (
  statuses: CaseStatusDefinition[],
  key: string
): CaseStatusDefinition[] =>
  statuses.map((status) =>
    status.key === key ? { ...status, disabled: !status.disabled } : status
  );

/** Whether another status, ignoring the one being edited, already uses this label. */
export const isLabelTaken = (
  statuses: CaseStatusDefinition[],
  label: string,
  ignoreKey?: string
): boolean => {
  const normalized = label.trim().toLowerCase();
  return statuses.some(
    (status) => status.key !== ignoreKey && status.label.trim().toLowerCase() === normalized
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONTROLLED_RUN_BUDGET_GROUP_IDS,
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
  type ControlledRunBudgetGroupId,
  type RunLimit,
} from '@kbn/significant-events-plugin/common';

export type RunLimitDraft = { enabled: false; max: 0 } | { enabled: true; max: number | '' };

type Drafts = Record<ControlledRunBudgetGroupId, RunLimitDraft>;
type Limits = Record<ControlledRunBudgetGroupId, RunLimit>;

export interface RunLimitDraftState {
  drafts: Drafts;
  saved: Limits;
  dirtyGroups: ControlledRunBudgetGroupId[];
  conflictingGroups: ControlledRunBudgetGroupId[];
}

export const toDraft = (limit: RunLimit): RunLimitDraft =>
  limit.enabled ? { enabled: true, max: limit.max } : { enabled: false, max: 0 };

export const toRunLimit = (draft: RunLimitDraft): RunLimit | undefined => {
  if (!draft.enabled) {
    return { enabled: false, max: 0 };
  }
  if (
    draft.max === '' ||
    !Number.isInteger(draft.max) ||
    draft.max < MIN_RUN_LIMIT ||
    draft.max > MAX_RUN_LIMIT
  ) {
    return undefined;
  }
  return { enabled: true, max: draft.max };
};

export const toDraftFromInput = (value: string): RunLimitDraft => {
  if (value === '') {
    return { enabled: true, max: '' };
  }
  const parsed = Number(value);
  if (parsed === 0) {
    return { enabled: false, max: 0 };
  }
  return { enabled: true, max: parsed };
};

const limitsEqual = (left: RunLimit, right: RunLimit): boolean =>
  left.enabled === right.enabled && left.max === right.max;

export const createRunLimitDraftState = (limits: Limits): RunLimitDraftState => ({
  drafts: Object.fromEntries(
    CONTROLLED_RUN_BUDGET_GROUP_IDS.map((group) => [group, toDraft(limits[group])])
  ) as Drafts,
  saved: limits,
  dirtyGroups: [],
  conflictingGroups: [],
});

export const editRunLimitDraft = (
  state: RunLimitDraftState,
  group: ControlledRunBudgetGroupId,
  draft: RunLimitDraft
): RunLimitDraftState => {
  const runLimit = toRunLimit(draft);
  const isDirty = !runLimit || !limitsEqual(runLimit, state.saved[group]);

  return {
    ...state,
    drafts: { ...state.drafts, [group]: draft },
    dirtyGroups: isDirty
      ? [...new Set([...state.dirtyGroups, group])]
      : state.dirtyGroups.filter((candidate) => candidate !== group),
    conflictingGroups: isDirty
      ? state.conflictingGroups
      : state.conflictingGroups.filter((candidate) => candidate !== group),
  };
};

export const mergeRunLimitRefresh = (
  state: RunLimitDraftState,
  limits: Limits
): RunLimitDraftState => {
  const dirty = new Set(state.dirtyGroups);
  const conflicting = new Set(state.conflictingGroups);
  const drafts = { ...state.drafts };

  for (const group of CONTROLLED_RUN_BUDGET_GROUP_IDS) {
    if (dirty.has(group)) {
      if (!limitsEqual(state.saved[group], limits[group])) {
        conflicting.add(group);
      }
    } else {
      drafts[group] = toDraft(limits[group]);
    }
  }

  return {
    drafts,
    saved: limits,
    dirtyGroups: state.dirtyGroups,
    conflictingGroups: [...conflicting],
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_RUN_LIMITS,
  type RunQuotaGroup,
  type RunQuotaSettingsUpdate,
  type RunQuotasResponse,
} from '@kbn/significant-events-plugin/common';

export const RUN_QUOTA_GROUPS = [
  'detection',
  'investigation',
  'ki_extraction',
] as const satisfies readonly RunQuotaGroup[];
export const MIN_RUN_LIMIT = 0;
export const MAX_RUN_LIMIT = 10_000;

export type RunLimitDraft = number | '';

interface SavedRunQuotaSettings {
  enabled: boolean;
  limits: Record<RunQuotaGroup, number>;
}

export interface RunQuotaDraftState {
  saved: SavedRunQuotaSettings;
  draft: {
    enabled: boolean;
    limits: Record<RunQuotaGroup, RunLimitDraft>;
  };
}

export const parseRunLimitDraft = (value: string): RunLimitDraft =>
  value === '' ? '' : Number(value);

export const isValidRunLimitDraft = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= MIN_RUN_LIMIT &&
  value <= MAX_RUN_LIMIT;

export const createRunQuotaDraftState = ({
  enabled,
  limits,
}: Pick<RunQuotasResponse, 'enabled'> & {
  limits?: Partial<Record<RunQuotaGroup, number>>;
}): RunQuotaDraftState => {
  const resolvedLimits = Object.fromEntries(
    RUN_QUOTA_GROUPS.map((group) => {
      const limit = limits?.[group];
      return [group, isValidRunLimitDraft(limit) ? limit : DEFAULT_RUN_LIMITS[group]];
    })
  ) as Record<RunQuotaGroup, number>;

  return {
    saved: {
      enabled,
      limits: resolvedLimits,
    },
    draft: {
      enabled,
      limits: { ...resolvedLimits },
    },
  };
};

export const hasRunQuotaDraftChanges = ({ saved, draft }: RunQuotaDraftState): boolean =>
  saved.enabled !== draft.enabled ||
  RUN_QUOTA_GROUPS.some((group) => saved.limits[group] !== draft.limits[group]);

export const isRunQuotaDraftValid = ({ draft }: RunQuotaDraftState): boolean =>
  RUN_QUOTA_GROUPS.every((group) => isValidRunLimitDraft(draft.limits[group]));

export const buildRunQuotaSettingsUpdate = (
  state: RunQuotaDraftState
): RunQuotaSettingsUpdate | undefined => {
  if (!isRunQuotaDraftValid(state)) {
    return undefined;
  }

  const update: RunQuotaSettingsUpdate = {};
  if (state.saved.enabled !== state.draft.enabled) {
    update.enabled = state.draft.enabled;
  }

  const changedLimits = Object.fromEntries(
    RUN_QUOTA_GROUPS.flatMap((group) =>
      state.saved.limits[group] === state.draft.limits[group]
        ? []
        : [[group, state.draft.limits[group]]]
    )
  ) as Partial<Record<RunQuotaGroup, number>>;

  if (Object.keys(changedLimits).length > 0) {
    update.limits = changedLimits;
  }

  return update.enabled === undefined && update.limits === undefined ? undefined : update;
};

export const isFiniteRunLimit = (limit: RunLimitDraft): limit is number =>
  isValidRunLimitDraft(limit) && limit > 0;

export const isLowerFiniteLimit = (previous: number, next: RunLimitDraft): next is number => {
  if (!isFiniteRunLimit(next)) {
    return false;
  }
  return previous === 0 || next < previous;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationStatus } from './types';

/** Limits of the status list (same names and values as the Cases custom statuses configuration). */
export const MAX_CASE_STATUSES_PER_CATEGORY = 10;
export const MAX_CASE_STATUSES = 30;
export const MAX_CASE_STATUS_KEY_LENGTH = 50;
export const MAX_CASE_STATUS_LABEL_LENGTH = 50;
export const MAX_CASE_PAUSE_REASONS = 10;
export const MAX_CASE_PAUSE_REASON_LENGTH = 50;
export const CASE_STATUS_KEY_PATTERN = /^[a-z0-9_-]+$/;

/** Seeded the first time a status pauses time tracking. */
export const DEFAULT_CASE_PAUSE_REASONS: readonly string[] = [
  'Awaiting customer',
  'Awaiting vendor',
  'Awaiting another team',
  'Scheduled work',
];

export const CASE_STATUS_CATEGORIES: readonly InvestigationStatus[] = [
  'open',
  'in-progress',
  'closed',
];

export const CASE_STATUS_CATEGORY_LABELS: Record<InvestigationStatus, string> = {
  open: 'Open',
  'in-progress': 'In progress',
  closed: 'Closed',
};

export interface CaseStatusConfiguration {
  /** Immutable; the built-in entries use the category values as keys. */
  key: string;
  label: string;
  category: InvestigationStatus;
  order: number;
  /** Target of writes that only name the category (classic Cases, take ownership, close). */
  isDefault: boolean;
  disabled: boolean;
  /** Time spent in this status is left out of the investigation's age and timings. */
  pausesTimeTracking?: boolean;
}

export interface StatusesConfiguration {
  statuses: CaseStatusConfiguration[];
  pauseReasons: string[];
  /** Concurrency token of the stored configuration. */
  version?: string | null;
}

/** Record fields that track pausing (same names as the Cases case fields). */
export interface PauseFields {
  paused_at: string | null;
  /** Seconds spent in pausing statuses. */
  time_paused: number;
  pause_reason: string | null;
  resume_to_status_key: string | null;
}

export const getBuiltInStatuses = (): CaseStatusConfiguration[] =>
  CASE_STATUS_CATEGORIES.map((category, order) => ({
    key: category,
    label: CASE_STATUS_CATEGORY_LABELS[category],
    category,
    order,
    isDefault: true,
    disabled: false,
  }));

/** The configured statuses sorted by `order`, or the three built-ins when none are configured. */
export const getEffectiveStatuses = (
  statuses: CaseStatusConfiguration[] | undefined | null
): CaseStatusConfiguration[] =>
  statuses?.length ? [...statuses].sort((a, b) => a.order - b.order) : getBuiltInStatuses();

export const findStatusByKey = (
  statuses: CaseStatusConfiguration[],
  key: string | null | undefined
): CaseStatusConfiguration | undefined =>
  key == null ? undefined : statuses.find((status) => status.key === key);

export const getDefaultStatus = (
  statuses: CaseStatusConfiguration[],
  category: InvestigationStatus
): CaseStatusConfiguration =>
  statuses.find((status) => status.category === category && status.isDefault) ??
  getBuiltInStatuses().find((status) => status.category === category) ??
  getBuiltInStatuses()[0];

/** Effective status of a record: its key when configured, else the category default. */
export const getRecordStatus = (
  statuses: CaseStatusConfiguration[],
  record: { status: InvestigationStatus; status_key?: string | null }
): CaseStatusConfiguration => {
  const configured = findStatusByKey(statuses, record.status_key);
  return configured && configured.category === record.status
    ? configured
    : getDefaultStatus(statuses, record.status);
};

/** Seconds a record has been paused in total, including a pause that is still running. */
export const getPausedSeconds = (
  record: Partial<Pick<PauseFields, 'paused_at' | 'time_paused'>>,
  now: number = Date.now()
): number => {
  const running = record.paused_at
    ? Math.max(Math.floor((now - new Date(record.paused_at).getTime()) / 1000), 0)
    : 0;
  return (record.time_paused ?? 0) + running;
};

/**
 * Returns the first rule the status configuration breaks, or null. Same rules and messages as
 * the Cases custom statuses validator.
 */
export const validateStatusesConfiguration = (
  requestStatuses: CaseStatusConfiguration[],
  originalStatuses: CaseStatusConfiguration[] = []
): string | null => {
  const keys = requestStatuses.map((status) => status.key);
  const duplicatedKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicatedKeys.length) {
    return `Invalid duplicated statuses keys in request: ${[...new Set(duplicatedKeys)].join(
      ', '
    )}`;
  }
  if (requestStatuses.length > MAX_CASE_STATUSES) {
    return `You can have at most ${MAX_CASE_STATUSES} statuses`;
  }
  for (const status of requestStatuses) {
    if (
      !CASE_STATUS_KEY_PATTERN.test(status.key) ||
      status.key.length > MAX_CASE_STATUS_KEY_LENGTH
    ) {
      return "Key must be lower case, a-z, 0-9, '_', and '-' are allowed";
    }
    const label = status.label.trim();
    if (!label.length || label.length > MAX_CASE_STATUS_LABEL_LENGTH) {
      return `Status labels must be 1 to ${MAX_CASE_STATUS_LABEL_LENGTH} characters`;
    }
  }
  const byKey = new Map(requestStatuses.map((status) => [status.key, status]));
  for (const category of CASE_STATUS_CATEGORIES) {
    const builtIn = byKey.get(category);
    if (!builtIn) return `The built-in status "${category}" is required`;
    if (builtIn.category !== category) {
      return `The built-in status "${category}" must belong to the "${category}" category`;
    }
  }
  for (const category of CASE_STATUS_CATEGORIES) {
    const inCategory = requestStatuses.filter((status) => status.category === category);
    if (inCategory.length > MAX_CASE_STATUSES_PER_CATEGORY) {
      return `The category "${category}" can have at most ${MAX_CASE_STATUSES_PER_CATEGORY} statuses`;
    }
    const labels = inCategory.map((status) => status.label.trim().toLowerCase());
    const duplicatedLabels = labels.filter((label, index) => labels.indexOf(label) !== index);
    if (duplicatedLabels.length) {
      return `Invalid duplicated statuses labels in category "${category}": ${[
        ...new Set(duplicatedLabels),
      ].join(', ')}`;
    }
    if (!inCategory.some((status) => !status.disabled)) {
      return `The category "${category}" needs at least one enabled status`;
    }
    const defaults = inCategory.filter((status) => status.isDefault);
    if (defaults.length !== 1) {
      return `The category "${category}" must have exactly one default status`;
    }
    if (defaults[0].disabled) {
      return `The default status of the category "${category}" cannot be disabled`;
    }
    if (defaults[0].pausesTimeTracking) {
      return `The default status of the category "${category}" cannot pause time tracking`;
    }
  }
  for (const status of requestStatuses) {
    if (status.pausesTimeTracking && status.category === 'closed') {
      return `The status "${status.key}" cannot pause time tracking: only statuses in the "open" and "in-progress" categories can`;
    }
  }
  for (const original of originalStatuses) {
    const updated = byKey.get(original.key);
    if (!updated) return `The status "${original.key}" cannot be removed, disable it instead`;
    if (updated.category !== original.category) {
      return `The category of the status "${original.key}" cannot be changed`;
    }
  }
  return null;
};

export const validatePauseReasons = (
  pauseReasons: string[],
  statuses: CaseStatusConfiguration[]
): string | null => {
  if (pauseReasons.length > MAX_CASE_PAUSE_REASONS) {
    return `You can have up to ${MAX_CASE_PAUSE_REASONS} pause reasons`;
  }
  if (pauseReasons.some((r) => !r.trim().length || r.length > MAX_CASE_PAUSE_REASON_LENGTH)) {
    return `Pause reasons must be 1 to ${MAX_CASE_PAUSE_REASON_LENGTH} characters`;
  }
  const normalized = pauseReasons.map((reason) => reason.trim().toLowerCase());
  const duplicated = normalized.filter((reason, index) => normalized.indexOf(reason) !== index);
  if (duplicated.length) {
    return `Invalid duplicated pause reasons: ${[...new Set(duplicated)].join(', ')}`;
  }
  if (
    statuses.some((status) => status.pausesTimeTracking && !status.disabled) &&
    pauseReasons.length === 0
  ) {
    return 'Add at least one pause reason when a status pauses time tracking';
  }
  return null;
};

export class StatusRuleError extends Error {}

/**
 * Pause bookkeeping for a status change, following the Cases rules: entering a pausing status
 * needs a known reason and starts the clock; pausing to pausing keeps it running; leaving adds
 * the interval to `time_paused`; reopening resets `time_paused`. Throws `StatusRuleError`.
 */
export const getPauseFieldsForUpdate = ({
  original,
  target,
  pauseReason,
  pauseReasons,
  statuses,
  now,
}: {
  original: { status: InvestigationStatus; status_key?: string | null } & Partial<PauseFields>;
  /** Undefined when the status does not change. */
  target?: CaseStatusConfiguration;
  pauseReason?: string | null;
  pauseReasons: string[];
  statuses: CaseStatusConfiguration[];
  now: string;
}): Partial<PauseFields> | undefined => {
  const assertKnownReason = (reason: string) => {
    if (!pauseReasons.includes(reason))
      throw new StatusRuleError(`Unknown pause reason: ${reason}`);
  };
  const wasPaused = original.paused_at != null;
  if (!target) {
    if (pauseReason == null) return;
    if (!wasPaused) {
      throw new StatusRuleError(
        'A pause reason can only be set when moving to a status that pauses time tracking'
      );
    }
    assertKnownReason(pauseReason);
    return { pause_reason: pauseReason };
  }
  if (target.pausesTimeTracking) {
    if (pauseReason != null) assertKnownReason(pauseReason);
    if (wasPaused) return pauseReason != null ? { pause_reason: pauseReason } : undefined;
    if (pauseReason == null) {
      throw new StatusRuleError(`A pause reason is required when moving to "${target.label}"`);
    }
    return {
      paused_at: now,
      pause_reason: pauseReason,
      resume_to_status_key:
        original.status_key ?? getDefaultStatus(statuses, original.status).key ?? original.status,
    };
  }
  if (pauseReason != null) {
    throw new StatusRuleError(`The status "${target.label}" does not pause time tracking`);
  }
  const reopened = original.status === 'closed' && target.category !== 'closed';
  if (wasPaused) {
    const pausedFor = Math.max(
      Math.floor(
        (new Date(now).getTime() - new Date(original.paused_at as string).getTime()) / 1000
      ),
      0
    );
    return {
      paused_at: null,
      pause_reason: null,
      resume_to_status_key: null,
      time_paused: reopened ? 0 : (original.time_paused ?? 0) + pausedFor,
    };
  }
  return reopened && (original.time_paused ?? 0) > 0 ? { time_paused: 0 } : undefined;
};

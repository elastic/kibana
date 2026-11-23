/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexDreamingConfig } from '../../../common/dreaming';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { draftBuildsAnything, draftOf } from '../components/dreaming_config/dreaming_config_editor';

export const SETUP_WIZARD_STEP_IDS = ['dreaming', 'connect', 'sources', 'describe'] as const;

export type SetupWizardStepId = (typeof SETUP_WIZARD_STEP_IDS)[number];

/** What the browser keeps per AI index: the step the user is on, or that they closed the wizard. */
export type SetupWizardStoredValue = SetupWizardStepId | 'closed';

export type SetupWizardDoneSteps = Readonly<Record<SetupWizardStepId, boolean>>;

/**
 * The one local storage key of the wizard. Its value is an object with one entry per AI index, e.g.
 * `{ "/kd-many": "sources", "/s/marketing/kd-many": "closed" }`.
 */
export const SETUP_WIZARD_STORAGE_KEY = 'contextEngine.setupWizard';

/**
 * Entry of one AI index in the stored object. AI index ids are unique per space only, so the entry
 * also holds the space, as the base path (`/s/<space>` outside the default space).
 */
export const getSetupWizardEntryKey = ({
  basePath,
  aiIndexId,
}: {
  basePath: string;
  aiIndexId: string;
}): string => `${basePath}/${aiIndexId}`;

const isSetupWizardStepId = (value: unknown): value is SetupWizardStepId =>
  SETUP_WIZARD_STEP_IDS.some((stepId) => stepId === value);

/** Narrows an unknown stored value to a known one, so an old or edited value is ignored. */
export const parseSetupWizardStoredValue = (value: unknown): SetupWizardStoredValue | undefined => {
  if (value === 'closed') {
    return 'closed';
  }
  return isSetupWizardStepId(value) ? value : undefined;
};

/** The wizard's steps. Without memory there is no dreaming, so its step is left out. */
export const getSetupWizardSteps = (isMemoryEnabled: boolean): readonly SetupWizardStepId[] =>
  isMemoryEnabled
    ? SETUP_WIZARD_STEP_IDS
    : SETUP_WIZARD_STEP_IDS.filter((stepId) => stepId !== 'dreaming');

/** Whether dreaming is set up: it runs, or it has types to build. Same rule as the Settings tab. */
export const isDreamingSetUp = (dreaming: AiIndexDreamingConfig | undefined): boolean =>
  dreaming !== undefined && (dreaming.enabled || draftBuildsAnything(draftOf(dreaming)));

/** Which steps are done, read from the AI index's own data. The wizard saves no progress itself. */
export const getSetupWizardDoneSteps = ({
  aiIndex,
  memoryCount,
}: {
  aiIndex: GetAiIndexResponse;
  memoryCount: number;
}): SetupWizardDoneSteps => ({
  dreaming: isDreamingSetUp(aiIndex.dreaming),
  connect: memoryCount > 0,
  sources: aiIndex.sources.length > 0,
  describe: (aiIndex.description ?? '').trim().length > 0,
});

/**
 * Steps that count when deciding where setup stands. Without memory no agent can save a memory, so
 * Connect agent can never be done and doesn't count.
 */
const getCountedSteps = (
  steps: readonly SetupWizardStepId[],
  isMemoryEnabled: boolean
): readonly SetupWizardStepId[] =>
  isMemoryEnabled ? steps : steps.filter((stepId) => stepId !== 'connect');

export type SetupWizardView =
  | { show: false }
  | { show: true; steps: readonly SetupWizardStepId[]; initialStep: SetupWizardStepId };

/**
 * Whether an AI index's Overview shows the setup wizard, and on which step it opens: the step the
 * user was on, else the first step that is not done.
 */
export const getSetupWizardView = ({
  isManaged,
  isMemoryEnabled,
  done,
  stored,
}: {
  isManaged: boolean;
  isMemoryEnabled: boolean;
  done: SetupWizardDoneSteps;
  stored: SetupWizardStoredValue | undefined;
}): SetupWizardView => {
  if (isManaged || stored === 'closed') {
    return { show: false };
  }

  const steps = getSetupWizardSteps(isMemoryEnabled);
  const firstNotDone = getCountedSteps(steps, isMemoryEnabled).find((stepId) => !done[stepId]);

  if (firstNotDone === undefined) {
    return { show: false };
  }

  const storedStep = stored !== undefined && steps.includes(stored) ? stored : undefined;

  return { show: true, steps, initialStep: storedStep ?? firstNotDone };
};

type SetupWizardEntryKeyParams = Parameters<typeof getSetupWizardEntryKey>[0];

type SetupWizardRecord = Readonly<Record<string, SetupWizardStoredValue>>;

/*
 * The wizard's only state store: local storage. The React app reads it live (see
 * `subscribeSetupWizardStorage`), so nothing is kept twice. When local storage is missing or blocked
 * (private mode, policies), the object lives in memory instead: the wizard still works, it only
 * forgets the step on refresh.
 */
let memoryFallback: SetupWizardRecord | undefined;
const listeners = new Set<() => void>();

const notifyListeners = (): void => listeners.forEach((listener) => listener());

const removeStoredRecord = (): void => {
  try {
    window.localStorage.removeItem(SETUP_WIZARD_STORAGE_KEY);
  } catch {
    // Nothing to remove when local storage is blocked.
  }
};

/** Keeps the entries with a known value. A malformed object is deleted, so it can't break setup. */
const parseRecord = (raw: string): SetupWizardRecord => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    removeStoredRecord();
    return {};
  }
  const record: Record<string, SetupWizardStoredValue> = {};
  Object.entries(parsed).forEach(([entryKey, value]) => {
    const storedValue = parseSetupWizardStoredValue(value);
    if (storedValue !== undefined) {
      record[entryKey] = storedValue;
    }
  });
  return record;
};

const readRecord = (): SetupWizardRecord => {
  if (memoryFallback !== undefined) {
    return memoryFallback;
  }
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SETUP_WIZARD_STORAGE_KEY);
  } catch {
    raw = null;
  }
  return raw === null ? {} : parseRecord(raw);
};

const writeRecord = (record: SetupWizardRecord): void => {
  try {
    if (Object.keys(record).length === 0) {
      window.localStorage.removeItem(SETUP_WIZARD_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SETUP_WIZARD_STORAGE_KEY, JSON.stringify(record));
    }
    memoryFallback = undefined;
  } catch {
    memoryFallback = record;
  }
  notifyListeners();
};

/** Calls `listener` when a wizard value changes, in this tab or in another one. */
export const subscribeSetupWizardStorage = (listener: () => void): (() => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

export const readSetupWizardStoredValue = (
  entryKeyParams: SetupWizardEntryKeyParams
): SetupWizardStoredValue | undefined => readRecord()[getSetupWizardEntryKey(entryKeyParams)];

export const writeSetupWizardStoredValue = (
  entryKeyParams: SetupWizardEntryKeyParams,
  value: SetupWizardStoredValue
): void => {
  writeRecord({ ...readRecord(), [getSetupWizardEntryKey(entryKeyParams)]: value });
};

/** Forgets the wizard state, so a new AI index that reuses an old id starts setup fresh. */
export const removeSetupWizardStoredValue = (entryKeyParams: SetupWizardEntryKeyParams): void => {
  const entryKey = getSetupWizardEntryKey(entryKeyParams);
  const record = readRecord();
  if (!(entryKey in record)) {
    return;
  }
  const { [entryKey]: _removed, ...rest } = record;
  writeRecord(rest);
};

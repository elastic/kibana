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

const SETUP_WIZARD_STORAGE_KEY_PREFIX = 'contextEngine.setupWizard';

/**
 * Local storage key of one AI index's wizard state. AI index ids are unique per space only, so the
 * key also holds the space, as the base path (`/s/<space>` outside the default space).
 */
export const getSetupWizardStorageKey = ({
  basePath,
  aiIndexId,
}: {
  basePath: string;
  aiIndexId: string;
}): string => `${SETUP_WIZARD_STORAGE_KEY_PREFIX}:${basePath}:${aiIndexId}`;

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

type SetupWizardStorageKeyParams = Parameters<typeof getSetupWizardStorageKey>[0];

/*
 * The wizard's only state store: local storage. The React app reads it live (see
 * `subscribeSetupWizardStorage`), so nothing is kept twice. When local storage is missing or blocked
 * (private mode, policies), values live in memory instead: the wizard still works, it only forgets
 * the step on refresh.
 */
const memoryFallback = new Map<string, string>();
const listeners = new Set<() => void>();

const notifyListeners = (): void => listeners.forEach((listener) => listener());

const readRaw = (key: string): string | null => {
  const fallback = memoryFallback.get(key);
  if (fallback !== undefined) {
    return fallback;
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
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
  keyParams: SetupWizardStorageKeyParams
): SetupWizardStoredValue | undefined => {
  const raw = readRaw(getSetupWizardStorageKey(keyParams));
  if (raw === null) {
    return undefined;
  }
  try {
    return parseSetupWizardStoredValue(JSON.parse(raw));
  } catch {
    return undefined;
  }
};

export const writeSetupWizardStoredValue = (
  keyParams: SetupWizardStorageKeyParams,
  value: SetupWizardStoredValue
): void => {
  const key = getSetupWizardStorageKey(keyParams);
  const raw = JSON.stringify(value);
  try {
    window.localStorage.setItem(key, raw);
    memoryFallback.delete(key);
  } catch {
    memoryFallback.set(key, raw);
  }
  notifyListeners();
};

/** Forgets the wizard state, so a new AI index that reuses an old id starts setup fresh. */
export const removeSetupWizardStoredValue = (keyParams: SetupWizardStorageKeyParams): void => {
  const key = getSetupWizardStorageKey(keyParams);
  memoryFallback.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to remove when local storage is blocked.
  }
  notifyListeners();
};

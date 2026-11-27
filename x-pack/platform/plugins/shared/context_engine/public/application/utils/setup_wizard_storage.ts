/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The one local storage key of the wizard. Its value is an object with one entry per AI index, e.g.
 * `{ "/kd-many": "sources", "/s/marketing/kd-many": "closed" }`.
 */
export const SETUP_WIZARD_STORAGE_KEY = 'contextEngine.setupWizard';

/** Stored instead of a step id when the user closed the wizard. */
export const SETUP_WIZARD_CLOSED = 'closed';

/**
 * Entry of one AI index in the stored object. AI index ids are unique per space only, so the entry
 * also holds the space, as the base path (`/s/<space>` outside the default space).
 */
interface SetupWizardEntryKeyParams {
  basePath: string;
  aiIndexId: string;
}

const getSetupWizardEntryKey = ({ basePath, aiIndexId }: SetupWizardEntryKeyParams): string =>
  `${basePath}/${aiIndexId}`;

/**
 * A step id or `SETUP_WIZARD_CLOSED`. Any string is kept, so the storage knows no steps: a step id
 * that no longer exists is ignored when the wizard opens.
 */
type SetupWizardRecord = Readonly<Record<string, string>>;

/*
 * The wizard's only state store is local storage, read live. When it is blocked, the object lives
 * in memory: the wizard still works, it only forgets the step on refresh.
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

/** Keeps the string entries. A malformed object is deleted, so it can't break setup. */
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
  const record: Record<string, string> = {};
  Object.entries(parsed).forEach(([entryKey, value]) => {
    if (typeof value === 'string') {
      record[entryKey] = value;
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
): string | undefined => readRecord()[getSetupWizardEntryKey(entryKeyParams)];

export const writeSetupWizardStoredValue = (
  entryKeyParams: SetupWizardEntryKeyParams,
  value: string
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

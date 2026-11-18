/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'kbn.contextSwitcherTrialBadge';
const TRIAL_BADGE_CHANGE_EVENT = 'kbn.contextSwitcherTrialBadgeChange';

const readStoredTrialBadge = (): boolean => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    // sessionStorage can be unavailable.
    return false;
  }
};

const listeners = new Set<() => void>();
let showTrialBadge: boolean | undefined;

export const getContextSwitcherTrialBadge = (): boolean => {
  if (showTrialBadge === undefined) {
    showTrialBadge = readStoredTrialBadge();
  }
  return showTrialBadge;
};

export const setContextSwitcherTrialBadge = (next: boolean) => {
  if (next === showTrialBadge) {
    return;
  }
  showTrialBadge = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Ignore write failures. The in-memory value still updates.
  }
  listeners.forEach((listener) => listener());
  window.dispatchEvent(new CustomEvent(TRIAL_BADGE_CHANGE_EVENT, { detail: next }));
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useContextSwitcherTrialBadge = (): boolean =>
  useSyncExternalStore(subscribe, getContextSwitcherTrialBadge, () => false);

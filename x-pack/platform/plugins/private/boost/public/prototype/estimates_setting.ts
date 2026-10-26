/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';

// Each tester's own choice, in their browser, rather than the deployment's shared prototype state.
const STORAGE_KEY = 'xpack.boost.prototype.showsEstimates';

const listeners = new Set<() => void>();

// The choice when storage is unavailable, such as in some private windows, until the page reloads.
let unstoredShowsEstimates = false;

/**
 * Whether the prototype shows search cost and VCU estimates, which it doesn't unless turned on: they
 * aren't planned for the initial release.
 */
export const getShowsEstimates = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return unstoredShowsEstimates;
  }
};

/** Turns the estimates on or off, for this browser, everywhere the prototype shows them. */
export const setShowsEstimates = (showsEstimates: boolean): void => {
  unstoredShowsEstimates = showsEstimates;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(showsEstimates));
  } catch {
    // Without storage, the choice is kept in memory instead.
  }
  listeners.forEach((listener) => listener());
};

// The prototype menu renders apart from the app, so both follow the setting through here, and
// through storage events from other tabs.
const subscribe = (listener: () => void): (() => void) => {
  const onStorage = ({ key }: StorageEvent) => {
    if (key === STORAGE_KEY) {
      listener();
    }
  };
  listeners.add(listener);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
};

/** Whether to show search cost and VCU estimates, following the prototype menu's setting. */
export const useShowsEstimates = (): boolean => useSyncExternalStore(subscribe, getShowsEstimates);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PENDING_RELOAD_SESSION_STORAGE_KEY = 'gen_ai_settings:pending_reload' as const;

/**
 * Best-effort check for whether the current page load was triggered by a reload navigation.
 *
 * Uses Navigation Timing L2 when available, with a legacy fallback for older browsers.
 */
export const getIsReloadNavigation = (perf: Performance = window.performance): boolean => {
  try {
    // Prefer modern Navigation Timing L2.
    const navEntries = perf.getEntriesByType?.('navigation') as PerformanceNavigationTiming[];
    if (Array.isArray(navEntries) && navEntries.length > 0) {
      return navEntries[0].type === 'reload';
    }

    // Fallback for older browsers.
    // https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigation/type
    const legacyNavigation = perf.navigation;
    return legacyNavigation?.type === 1;
  } catch {
    return false;
  }
};

export const getPendingReloadFlag = (
  storage: Storage = window.sessionStorage,
  key: string = PENDING_RELOAD_SESSION_STORAGE_KEY
): boolean => {
  try {
    return storage.getItem(key) === '1';
  } catch {
    return false;
  }
};

export const clearPendingReloadFlag = (
  storage: Storage = window.sessionStorage,
  key: string = PENDING_RELOAD_SESSION_STORAGE_KEY
): void => {
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
};

export const setPendingReloadFlag = (
  storage: Storage = window.sessionStorage,
  key: string = PENDING_RELOAD_SESSION_STORAGE_KEY
): void => {
  try {
    storage.setItem(key, '1');
  } catch {
    // ignore
  }
};

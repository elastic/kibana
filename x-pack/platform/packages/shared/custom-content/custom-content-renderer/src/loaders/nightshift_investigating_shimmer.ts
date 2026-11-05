/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const STORAGE_KEY = 'agentBuilder.nightshiftInvestigatingShimmer';

const readStoredShimmer = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
};

let enabled = readStoredShimmer();
const listeners = new Set<() => void>();

export const getNightshiftInvestigatingShimmer = (): boolean => enabled;

export const setNightshiftInvestigatingShimmer = (next: boolean): void => {
  if (enabled === next) {
    return;
  }
  enabled = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false');
  } catch {
    // The choice still applies for this session when storage is unavailable.
  }
  listeners.forEach((listener) => listener());
};

export const subscribeNightshiftInvestigatingShimmer = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type PrototypeVersion = 'v1' | 'v2' | 'v3';

const STORAGE_KEY = 'esqlViews:prototypeVersion';
const DEFAULT_VERSION: PrototypeVersion = 'v1';

type PrototypeVersionListener = (version: PrototypeVersion) => void;

const listeners = new Set<PrototypeVersionListener>();

const isPrototypeVersion = (value: unknown): value is PrototypeVersion =>
  value === 'v1' || value === 'v2' || value === 'v3';

/**
 * Backs the "prototype version" button group appended next to the page's breadcrumbs
 * (see `prototype_version_switcher.tsx`), letting reviewers flip between alternate UX
 * takes on this prototype. The selection is kept in localStorage rather than React state
 * because the switcher and the page content are mounted as two separate React trees.
 */
export const getPrototypeVersion = (): PrototypeVersion => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isPrototypeVersion(stored) ? stored : DEFAULT_VERSION;
  } catch {
    return DEFAULT_VERSION;
  }
};

export const setPrototypeVersion = (version: PrototypeVersion): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, version);
  } catch {
    // Ignore write failures, e.g. storage disabled or full.
  }
  listeners.forEach((listener) => listener(version));
};

export const subscribeToPrototypeVersion = (listener: PrototypeVersionListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

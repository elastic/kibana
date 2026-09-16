/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type PrototypeTableState = 'empty' | 'filled';

const STORAGE_KEY = 'esqlViews:prototypeTableState';
const DEFAULT_STATE: PrototypeTableState = 'filled';

type PrototypeTableStateListener = (state: PrototypeTableState) => void;

const listeners = new Set<PrototypeTableStateListener>();

const isPrototypeTableState = (value: unknown): value is PrototypeTableState =>
  value === 'empty' || value === 'filled';

/**
 * Backs the empty/filled toggle appended next to the page breadcrumbs so reviewers
 * can preview the list empty state without clearing cluster data. Kept in localStorage
 * because the switcher and page content mount as separate React trees.
 */
export const getPrototypeTableState = (): PrototypeTableState => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isPrototypeTableState(stored) ? stored : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
};

export const setPrototypeTableState = (state: PrototypeTableState): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, state);
  } catch {
    // Ignore write failures, e.g. storage disabled or full.
  }
  listeners.forEach((listener) => listener(state));
};

export const subscribeToPrototypeTableState = (
  listener: PrototypeTableStateListener
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

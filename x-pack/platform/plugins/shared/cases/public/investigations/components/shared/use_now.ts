/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';

const TICK_MS = 30000;

let currentNow = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  if (timer === null) {
    currentNow = Date.now();
    timer = setInterval(() => {
      currentNow = Date.now();
      listeners.forEach((notify) => notify());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
};

const getSnapshot = (): number => currentNow;

/** The current time, refreshed every 30 seconds by one shared timer. */
export const useNow = (): number => useSyncExternalStore(subscribe, getSnapshot);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

let preview = false;
const listeners = new Set<() => void>();

/** Whether the Alert Zero page is forced into the workers-running state. */
export const getWorkersRunningPreview = (): boolean => preview;

export const setWorkersRunningPreview = (next: boolean): void => {
  if (preview === next) {
    return;
  }
  preview = next;
  listeners.forEach((listener) => listener());
};

export const subscribeWorkersRunningPreview = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

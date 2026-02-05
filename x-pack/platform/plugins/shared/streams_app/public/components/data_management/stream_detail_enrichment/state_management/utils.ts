/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';

/**
 * Recursively collects all descendant step IDs
 * for a given parent step ID.
 */
export function collectDescendantStepIds(
  steps: StreamlangStepWithUIAttributes[],
  parentId: string
) {
  const ids = new Set<string>();

  steps.forEach((step) => {
    if (step.parentId === parentId) {
      ids.add(step.customIdentifier);
      collectDescendantStepIds(steps, step.customIdentifier).forEach((childId) => ids.add(childId));
    }
  });

  return ids;
}

/**
 * Safely parses JSON from sessionStorage, returning undefined on parse failure.
 * If parsing fails, removes the corrupted entry from sessionStorage and logs a warning.
 *
 * @param key The sessionStorage key to read from
 * @returns The parsed value or undefined if not found or corrupted
 */
export function safeParseSessionStorageItem<T>(key: string): T | undefined {
  const value = sessionStorage.getItem(key);
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value) as T;
  } catch (e) {
    // Corrupted data - remove from sessionStorage and continue
    sessionStorage.removeItem(key);
    // eslint-disable-next-line no-console
    console.warn(`Removed corrupted sessionStorage entry: ${key}`);
    return undefined;
  }
}

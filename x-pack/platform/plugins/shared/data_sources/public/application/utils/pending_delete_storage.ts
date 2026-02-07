/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const STORAGE_KEY = 'dataSources:pendingBulkDelete';

interface PendingBulkDelete {
  taskId: string;
  ids: string[];
}

/**
 * Saves or updates the pending bulk delete entry in sessionStorage.
 * Merges with existing data so you can set `ids` first, then `taskId` later.
 */
export const savePendingBulkDelete = (update: Partial<PendingBulkDelete>): void => {
  try {
    const existing = getPendingBulkDelete();
    const merged: PendingBulkDelete = {
      taskId: update.taskId ?? existing?.taskId ?? '',
      ids: update.ids ?? existing?.ids ?? [],
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // sessionStorage may be unavailable (e.g. private browsing); silently ignore
  }
};

/**
 * Retrieves the full pending bulk delete info from sessionStorage.
 */
export const getPendingBulkDelete = (): PendingBulkDelete | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingBulkDelete;
  } catch {
    return null;
  }
};

/**
 * Returns a Set of data source IDs that are pending deletion.
 * Used by useActiveSources to filter items from the list.
 */
export const getPendingDeleteIds = (): Set<string> => {
  const pending = getPendingBulkDelete();
  return new Set(pending?.ids ?? []);
};

/**
 * Returns the taskId for the active bulk delete task, if any.
 */
export const getPendingDeleteTaskId = (): string | null => {
  const pending = getPendingBulkDelete();
  return pending?.taskId || null;
};

/**
 * Clears the pending bulk delete from sessionStorage.
 * Called when the task completes (success or failure).
 */
export const clearPendingBulkDelete = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // silently ignore
  }
};

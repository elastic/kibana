/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryAdapter } from '../src/types/change_history_adapter';
import type { ChangeHistoryDetail } from '../src/types/change_history_detail';
import type { ChangeHistoryListItem } from '../src/types/change_history_list_item';
import type { ChangeHistoryPendingChange } from '../src/types/change_history_pending_change';
import type { ListChangeHistoryResult } from '../src/types/list_change_history_params';
import { createMockChangeHistoryDetails } from './change_history_fixtures';

const toListItem = (detail: ChangeHistoryDetail): ChangeHistoryListItem => ({
  id: detail.id,
  timestamp: detail.timestamp,
  actor: detail.actor,
  action: detail.action,
  ...(detail.changes ? { changes: detail.changes } : {}),
  ...(detail.comment ? { comment: detail.comment } : {}),
  ...(detail.isCurrent ? { isCurrent: detail.isCurrent } : {}),
  ...(detail.tags ? { tags: detail.tags } : {}),
  ...(detail.metadata ? { metadata: detail.metadata } : {}),
});

const delay = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = (): void => {
      clearTimeout(timeoutId);
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });

export interface CreateMockChangeHistoryAdapterOptions {
  /** In-memory changes, newest first. Defaults to {@link createMockChangeHistoryDetails}. */
  changes?: ChangeHistoryDetail[];
  /** Artificial latency for list/detail calls (ms). */
  listDelayMs?: number;
  detailDelayMs?: number;
  /** When set, `listChanges` rejects with this error. */
  listError?: Error;
  /** When set, `getChange` rejects with this error. */
  detailError?: Error;
  /** Optional restore handler. When omitted, restore is unavailable. */
  onRestoreChange?: ChangeHistoryAdapter['restoreChange'];
  /** Optional pending in-editor change for `features.unsavedChanges`. */
  getPendingChange?: () => ChangeHistoryPendingChange | undefined;
}

export interface MockChangeHistoryAdapter extends ChangeHistoryAdapter {
  /** Replace the in-memory change set (newest first). */
  setChanges: (changes: ChangeHistoryDetail[]) => void;
  /** Read the current in-memory change set (newest first). */
  getChanges: () => ChangeHistoryDetail[];
}

export const createMockChangeHistoryAdapter = (
  options: CreateMockChangeHistoryAdapterOptions = {}
): MockChangeHistoryAdapter => {
  let changes = [...(options.changes ?? createMockChangeHistoryDetails())];

  const adapter: MockChangeHistoryAdapter = {
    listChanges: async ({ page, signal }): Promise<ListChangeHistoryResult> => {
      if (options.listError) {
        throw options.listError;
      }

      if (options.listDelayMs) {
        await delay(options.listDelayMs, signal);
      }

      signal?.throwIfAborted();

      const start = page.index * page.size;
      const pageItems = changes.slice(start, start + page.size).map(toListItem);

      return {
        items: pageItems,
        total: changes.length,
      };
    },

    getChange: async ({ changeId, signal }) => {
      if (options.detailError) {
        throw options.detailError;
      }

      if (options.detailDelayMs) {
        await delay(options.detailDelayMs, signal);
      }

      signal?.throwIfAborted();

      const detail = changes.find((change) => change.id === changeId);
      if (!detail) {
        throw new Error(`Mock change "${changeId}" was not found`);
      }

      return detail;
    },

    ...(options.onRestoreChange ? { restoreChange: options.onRestoreChange } : {}),
    ...(options.getPendingChange ? { getPendingChange: options.getPendingChange } : {}),

    setChanges: (nextChanges) => {
      changes = [...nextChanges];
    },

    getChanges: () => [...changes],
  };

  return adapter;
};

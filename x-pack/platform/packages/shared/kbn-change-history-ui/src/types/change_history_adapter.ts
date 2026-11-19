/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryDetail } from './change_history_detail';
import type {
  GetChangeParams,
  ListChangeHistoryParams,
  ListChangeHistoryResult,
} from './list_change_history_params';
import type { RestoreChangeParams } from './restore_change_params';
import type { ChangeHistoryPendingChange } from './change_history_pending_change';

/** Integration surface between a domain plugin and the shared UI. */
export interface ChangeHistoryAdapter {
  /**
   * Returns paginated changes for the object.
   *
   * `items` MUST be in descending timestamp order (newest first). Required for
   * compare-with-previous preview and timeline display.
   */
  listChanges: (params: ListChangeHistoryParams) => Promise<ListChangeHistoryResult>;
  /**
   * Returns full detail for a single change (`changeId` / `event.id`).
   *
   * The preview panel calls this when compare needs a baseline or target snapshot that
   * is not already available on the selected row. Implementations should resolve any
   * `changeId` the UI requests (for example via a detail API or an adapter-local cache
   * populated by `listChanges`).
   */
  getChange: (params: GetChangeParams) => Promise<ChangeHistoryDetail>;
  restoreChange?: (params: RestoreChangeParams) => Promise<void>;
  /**
   * Returns in-editor state not yet committed to change history.
   * Used only when `features.unsavedChanges` is true on `ChangeHistoryProvider`.
   */
  getPendingChange?: () => ChangeHistoryPendingChange | undefined;
}

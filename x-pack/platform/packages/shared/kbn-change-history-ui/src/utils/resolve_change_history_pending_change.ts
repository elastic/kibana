/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import type { ChangeHistoryPendingChange } from '../types/change_history_pending_change';

/** Resolves in-editor pending state when the unsaved-changes feature is enabled. */
export const resolveChangeHistoryPendingChange = (
  adapter: ChangeHistoryAdapter,
  unsavedChangesEnabled: boolean
): ChangeHistoryPendingChange | undefined => {
  if (!unsavedChangesEnabled || typeof adapter.getPendingChange !== 'function') {
    return undefined;
  }

  return adapter.getPendingChange();
};

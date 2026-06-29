/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';
import type { ChangeHistoryListItem } from '../types/change_history_list_item';

/** Package-internal runtime state: modal, selection, and list data owned by the provider. */
export interface ChangeHistoryStateValue {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  selectedChangeId?: string;
  setSelectedChangeId: (changeId: string | undefined) => void;
  items: ChangeHistoryListItem[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error?: Error;
  loadMore: () => void;
  /** Refetch the list and select the current (top) change once it resolves. */
  refetchAndSelectCurrent: () => Promise<void>;
}

export const ChangeHistoryStateContext = createContext<ChangeHistoryStateValue | undefined>(
  undefined
);

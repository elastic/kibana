/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext } from 'react';

/** Package-internal modal, selection, and list refresh state. */
export interface ChangeHistoryInternalConfigValue {
  refetchList: () => Promise<void>;
  registerListRefetch: (refetch: (() => Promise<void> | void) | undefined) => void;
  isListRefreshPending: boolean;
  setListRefreshPending: (pending: boolean) => void;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  selectedChangeId?: string;
  setSelectedChangeId: (changeId: string | undefined) => void;
}

export const ChangeHistoryInternalConfigContext = createContext<
  ChangeHistoryInternalConfigValue | undefined
>(undefined);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { NotebookStore } from '../model/notebook_store';
import type { NotebookScheduler } from '../model/scheduler';

export interface NotebookContextValue {
  store: NotebookStore;
  scheduler: NotebookScheduler;
}

export const NotebookContext = createContext<NotebookContextValue | null>(null);

export const useNotebook = (): NotebookContextValue => {
  const value = useContext(NotebookContext);
  if (!value) {
    throw new Error('useNotebook must be used inside NotebookContext');
  }
  return value;
};

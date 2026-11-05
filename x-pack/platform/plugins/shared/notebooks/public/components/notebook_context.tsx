/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { BehaviorSubject } from 'rxjs';
import type { CellFilter } from '../model/cell_filter';
import type { NotebookStore } from '../model/notebook_store';
import type { NotebookScheduler } from '../model/scheduler';

export interface NotebookContextValue {
  store: NotebookStore;
  scheduler: NotebookScheduler;
  /** Number of notebook flyouts currently open. */
  openFlyouts$: BehaviorSubject<number>;
  /** The cell selected in the dependency graph or revealed from an app, highlighted in the notebook. */
  focusedCell$: BehaviorSubject<string | undefined>;
  /** Scrolls the notebook to the cell and flashes it, clearing the filter if it hides the cell. */
  revealCell: (cellId: string) => void;
  /** Which cells the notebook shows. */
  cellFilter$: BehaviorSubject<CellFilter>;
  /** Cells the user just added; each flashes once when it first renders, then leaves the set. */
  addedCellIds: Set<string>;
  /** What the panel beside the notebook shows, if it is open. */
  sidePanel$: BehaviorSubject<SidePanel | undefined>;
  /** The app the app panel shows; falls back to the first app when unset or deleted. */
  activeAppId$: BehaviorSubject<string | undefined>;
}

export type SidePanel = 'graph' | 'app';

export const NotebookContext = createContext<NotebookContextValue | null>(null);

export const useNotebook = (): NotebookContextValue => {
  const value = useContext(NotebookContext);
  if (!value) {
    throw new Error('useNotebook must be used inside NotebookContext');
  }
  return value;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { ISearchStart } from '@kbn/data-plugin/public';
import type { NotebookAttributes } from '../../common/types';
import { EMPTY_CELL_FILTER, matchesCellFilter, type CellFilter } from '../model/cell_filter';
import { isPinnedTimeCell } from '../model/cell_factory';
import { NotebookStore } from '../model/notebook_store';
import { createRunQuery } from '../model/run_query';
import { NotebookScheduler, type SchedulerDeps } from '../model/scheduler';
import { getCellElementId } from './cell_display';
import type { NotebookContextValue, SidePanel } from './notebook_context';

const SCROLL_ATTEMPTS = 10;

/** Scrolls to the cell, waiting a few frames for it to render if a filter change just showed it. */
const scrollToCell = (cellId: string, attemptsLeft = SCROLL_ATTEMPTS): void => {
  const element = document.getElementById(getCellElementId(cellId));
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (attemptsLeft > 0) {
    requestAnimationFrame(() => scrollToCell(cellId, attemptsLeft - 1));
  }
};

/** A notebook's store and scheduler, with the shared state its views read. */
export const createNotebookContext = ({
  attributes,
  search,
  notebookId,
  scope,
  ignoreManualRunMode,
  initialAppId,
}: {
  attributes: NotebookAttributes;
  search: ISearchStart;
  notebookId?: string;
  /** Opens the app panel showing this app. */
  initialAppId?: string;
} & Pick<SchedulerDeps, 'scope' | 'ignoreManualRunMode'>): NotebookContextValue => {
  const store = new NotebookStore(attributes);
  const scheduler = new NotebookScheduler(store, {
    runQuery: createRunQuery(search),
    scope,
    ignoreManualRunMode,
  });
  const focusedCell$ = new BehaviorSubject<string | undefined>(undefined);
  const cellFilter$ = new BehaviorSubject<CellFilter>(EMPTY_CELL_FILTER);
  const addedCellIds = new Set<string>();
  return {
    notebookId,
    store,
    scheduler,
    openFlyouts$: new BehaviorSubject(0),
    focusedCell$,
    revealCell: (cellId) => {
      const cell = store.getCell(cellId);
      if (
        cell &&
        !isPinnedTimeCell(cell) &&
        !matchesCellFilter(cell, cellFilter$.getValue(), store.apps$.getValue())
      ) {
        // The cell mounts after the filter clears, too late to see this focus, so it flashes as added.
        addedCellIds.add(cellId);
        cellFilter$.next(EMPTY_CELL_FILTER);
      }
      focusedCell$.next(cellId);
      scrollToCell(cellId);
    },
    cellFilter$,
    addedCellIds,
    editOnAddCellIds: new Set<string>(),
    sidePanel$: new BehaviorSubject<SidePanel | undefined>(initialAppId ? 'app' : undefined),
    activeAppId$: new BehaviorSubject<string | undefined>(initialAppId),
  };
};

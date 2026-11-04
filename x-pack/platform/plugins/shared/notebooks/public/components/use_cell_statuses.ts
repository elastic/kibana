/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { combineLatest, map } from 'rxjs';
import type { CellStatus } from '../model/types';
import { useNotebook } from './notebook_context';

/** The live status of each given cell, keyed by cell id. */
export const useCellStatuses = (
  cellIds: readonly string[]
): Readonly<Record<string, CellStatus>> => {
  const { store } = useNotebook();
  const [statuses, setStatuses] = useState<Readonly<Record<string, CellStatus>>>({});
  useEffect(() => {
    if (cellIds.length === 0) {
      setStatuses({});
      return;
    }
    const subscription = combineLatest(
      cellIds.map((id) => store.getRuntime$(id).pipe(map(({ status }) => [id, status] as const)))
    ).subscribe((entries) => setStatuses(Object.fromEntries(entries)));
    return () => subscription.unsubscribe();
  }, [store, cellIds]);
  return statuses;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { FetchContext } from '@kbn/presentation-publishing';
import type { EsqlDataSource } from '@kbn/custom-app-common';

export interface SourceData {
  columns: ReadonlyArray<{ name: string; type: string }>;
  rows: ReadonlyArray<ReadonlyArray<unknown>>;
}

export type SourceState =
  | { status: 'loading' }
  | { status: 'success'; data: SourceData }
  | { status: 'error'; message: string };

export type RunQuery = (
  source: EsqlDataSource,
  context: FetchContext,
  signal: AbortSignal
) => Promise<SourceData>;

export interface DataLayer {
  /** The live state of one data source. The same subject is returned for the same id. */
  getSource$: (id: string) => BehaviorSubject<SourceState>;
  /** True until the first run settles, and while any source is running. */
  loading$: BehaviorSubject<boolean | undefined>;
  setSources: (sources: Record<string, EsqlDataSource>) => void;
  /** Runs every source with the given context, superseding any run in flight. */
  refresh: (context: FetchContext) => void;
  /** Runs every source again with the last context. */
  retry: () => void;
  destroy: () => void;
}

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Owns the data of a panel. Nodes read a source by id, so any number of nodes sharing a source
 * cost one request, and a source that fails does not affect the others.
 */
export const createDataLayer = ({ runQuery }: { runQuery: RunQuery }): DataLayer => {
  const states = new Map<string, BehaviorSubject<SourceState>>();
  // Starts true so the panel is not reported as rendered before its first fetch has settled.
  const loading$ = new BehaviorSubject<boolean | undefined>(true);
  let sources: Record<string, EsqlDataSource> = {};
  let context: FetchContext | undefined;
  let controller: AbortController | undefined;

  const getSource$ = (id: string) => {
    let state$ = states.get(id);
    if (!state$) {
      state$ = new BehaviorSubject<SourceState>({ status: 'loading' });
      states.set(id, state$);
    }
    return state$;
  };

  const run = () => {
    controller?.abort();
    if (!context) return;

    const currentController = new AbortController();
    controller = currentController;
    const currentContext = context;
    const entries = Object.entries(sources);

    loading$.next(entries.length > 0);

    const runs = entries.map(async ([id, source]) => {
      const state$ = getSource$(id);
      state$.next({ status: 'loading' });
      try {
        const data = await runQuery(source, currentContext, currentController.signal);
        if (!currentController.signal.aborted) state$.next({ status: 'success', data });
      } catch (error) {
        if (!currentController.signal.aborted) {
          state$.next({ status: 'error', message: toMessage(error) });
        }
      }
    });

    Promise.all(runs).then(() => {
      if (controller === currentController) loading$.next(false);
    });
  };

  return {
    getSource$,
    loading$,
    setSources: (next) => {
      sources = next;
      run();
    },
    refresh: (next) => {
      context = next;
      run();
    },
    retry: run,
    destroy: () => {
      controller?.abort();
      controller = undefined;
    },
  };
};

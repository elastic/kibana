/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { FetchContext } from '@kbn/presentation-publishing';
import type { EsqlDataSource, StateValue } from '@kbn/custom-app-common';

export interface SourceData {
  columns: ReadonlyArray<{ name: string; type: string }>;
  rows: ReadonlyArray<ReadonlyArray<unknown>>;
}

export type SourceState =
  | { status: 'loading' }
  | { status: 'success'; data: SourceData }
  | { status: 'error'; message: string };

export type StateValues = Readonly<Record<string, StateValue>>;

export interface SourceRequest {
  context: FetchContext;
  /** The panel's state, offered to the query as named parameters. */
  state: StateValues;
}

export type RunQuery = (
  source: EsqlDataSource,
  request: SourceRequest,
  signal: AbortSignal
) => Promise<SourceData>;

export interface DataLayer {
  /** The live state of one data source. The same subject is returned for the same id. */
  getSource$: (id: string) => BehaviorSubject<SourceState>;
  /**
   * Declares that a mounted node reads a source, which makes it run. Returns the function that
   * ends the declaration; a source nobody reads is neither run nor refreshed.
   */
  acquire: (id: string) => () => void;
  /** True until the first fetch has settled, and while any source is running. */
  loading$: BehaviorSubject<boolean | undefined>;
  setSources: (sources: Record<string, EsqlDataSource>) => void;
  /** Replaces the state. Only the sources that use a changed value run again. */
  setState: (state: StateValues) => void;
  /** Runs every source that is being read, superseding any run in flight. */
  refresh: (context: FetchContext) => void;
  /** Runs every source that is being read again, with the last context. */
  retry: () => void;
  destroy: () => void;
}

interface SourceEntry {
  readers: number;
  controller?: AbortController;
  /** The values of the parameters the source used the last time it ran. */
  appliedValues: Record<string, StateValue | undefined>;
}

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Owns the data of a panel. A source runs while a node reads it, however many nodes do, and a
 * source that fails does not affect the others. State changes re-run only the sources whose query
 * uses a parameter whose value changed.
 */
export const createDataLayer = ({
  runQuery,
  getParameterNames,
}: {
  runQuery: RunQuery;
  /** The names of the `?param` and `??param` parameters a query uses. */
  getParameterNames: (query: string) => string[];
}): DataLayer => {
  const states = new Map<string, BehaviorSubject<SourceState>>();
  const entries = new Map<string, SourceEntry>();
  const running = new Set<string>();
  const parameterNames = new Map<string, { query: string; names: string[] }>();
  const loading$ = new BehaviorSubject<boolean | undefined>(true);

  let sources: Record<string, EsqlDataSource> = {};
  let state: StateValues = {};
  let context: FetchContext | undefined;

  const getSource$ = (id: string) => {
    let state$ = states.get(id);
    if (!state$) {
      state$ = new BehaviorSubject<SourceState>({ status: 'loading' });
      states.set(id, state$);
    }
    return state$;
  };

  // Starts true so the panel is not reported as rendered before its first fetch has settled.
  const publishLoading = () => loading$.next(context === undefined || running.size > 0);

  const namesUsedBy = (id: string, query: string): string[] => {
    const cached = parameterNames.get(id);
    if (cached?.query === query) return cached.names;
    const names = getParameterNames(query);
    parameterNames.set(id, { query, names });
    return names;
  };

  const stop = (id: string, entry: SourceEntry) => {
    entry.controller?.abort();
    entry.controller = undefined;
    running.delete(id);
  };

  const start = (id: string) => {
    const entry = entries.get(id);
    if (!entry || entry.readers === 0 || !context) return;

    stop(id, entry);
    const state$ = getSource$(id);
    const source = sources[id];
    if (!source) {
      state$.next({ status: 'error', message: `Unknown data source "${id}"` });
      publishLoading();
      return;
    }

    const controller = new AbortController();
    entry.controller = controller;
    entry.appliedValues = Object.fromEntries(
      namesUsedBy(id, source.query).map((name) => [name, state[name]])
    );
    running.add(id);
    state$.next({ status: 'loading' });
    publishLoading();

    runQuery(source, { context, state }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) state$.next({ status: 'success', data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) state$.next({ status: 'error', message: toMessage(error) });
      })
      .finally(() => {
        if (entry.controller !== controller) return;
        entry.controller = undefined;
        running.delete(id);
        publishLoading();
      });
  };

  const startAll = () => entries.forEach((_entry, id) => start(id));

  return {
    getSource$,
    loading$,
    acquire: (id) => {
      const entry = entries.get(id) ?? { readers: 0, appliedValues: {} };
      entries.set(id, entry);
      entry.readers++;
      if (entry.readers === 1) start(id);

      let released = false;
      return () => {
        if (released) return;
        released = true;
        entry.readers--;
        if (entry.readers > 0) return;
        stop(id, entry);
        getSource$(id).next({ status: 'loading' });
        publishLoading();
      };
    },
    setSources: (next) => {
      const previous = sources;
      sources = next;
      entries.forEach((_entry, id) => {
        const before = previous[id];
        const after = next[id];
        if (before?.query !== after?.query) start(id);
      });
    },
    setState: (next) => {
      state = next;
      entries.forEach((entry, id) => {
        const source = sources[id];
        if (!source || entry.readers === 0) return;
        const changed = namesUsedBy(id, source.query).some(
          (name) => state[name] !== entry.appliedValues[name]
        );
        if (changed) start(id);
      });
    },
    refresh: (next) => {
      context = next;
      startAll();
      publishLoading();
    },
    retry: startAll,
    destroy: () => {
      entries.forEach((entry, id) => stop(id, entry));
    },
  };
};

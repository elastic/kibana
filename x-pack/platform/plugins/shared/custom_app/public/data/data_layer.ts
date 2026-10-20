/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { FetchContext } from '@kbn/presentation-publishing';
import isEqual from 'lodash/isEqual';
import {
  getSourceStateKeys,
  type CasesSource,
  type DataSource,
  type StateValue,
} from '@kbn/custom-app-common';

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
  query: string,
  request: SourceRequest,
  signal: AbortSignal
) => Promise<SourceData>;

/** Fetches the cases a component shows, as the user, who sees the cases they may. */
export type RunCases = (
  source: CasesSource,
  request: SourceRequest,
  signal: AbortSignal
) => Promise<SourceData>;

export interface DataLayer {
  /** The live state of one component's data. The same subject is returned for the same id. */
  getSource$: (id: string) => BehaviorSubject<SourceState>;
  /**
   * Declares that a mounted component shows its data, which makes its query run. Returns the
   * function that ends the declaration; a query nobody shows is neither run nor refreshed.
   */
  acquire: (id: string) => () => void;
  /**
   * What the panel was last refreshed with: the time range, filters and query a dashboard offers.
   * For a component that fetches through something other than this layer, such as a chart.
   */
  context$: BehaviorSubject<FetchContext | undefined>;
  /** True until the first fetch has settled, and while any source is running. */
  loading$: BehaviorSubject<boolean | undefined>;
  /** Where each component that shows data gets it from, by the id of the component. */
  setSources: (sources: Record<string, DataSource>) => void;
  /** The same, for components that only run queries. */
  setQueries: (queries: Record<string, string>) => void;
  /** Replaces the state. Only the queries that use a changed value run again. */
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
 * Owns the data of a panel. A component's query runs while the component is shown, and one that
 * fails does not affect the others. State changes re-run only the queries that use a parameter
 * whose value changed.
 */
export const createDataLayer = ({
  runQuery,
  runCases,
  getParameterNames,
}: {
  runQuery: RunQuery;
  /** Absent where cases cannot be had, and then a component that shows them says so. */
  runCases?: RunCases;
  /** The names of the `?param` and `??param` parameters a query uses. */
  getParameterNames: (query: string) => string[];
}): DataLayer => {
  const states = new Map<string, BehaviorSubject<SourceState>>();
  const entries = new Map<string, SourceEntry>();
  const running = new Set<string>();
  const parameterNames = new Map<string, { query: string; names: string[] }>();
  const loading$ = new BehaviorSubject<boolean | undefined>(true);
  const context$ = new BehaviorSubject<FetchContext | undefined>(undefined);

  let sources: Record<string, DataSource> = {};
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

  /** The values of the app a source is driven by: the `?names` of a query, the filters of cases. */
  const namesUsedBy = (id: string, source: DataSource): string[] => {
    if (source.type === 'cases') return getSourceStateKeys(source);
    const cached = parameterNames.get(id);
    if (cached?.query === source.query) return cached.names;
    const names = getParameterNames(source.query);
    parameterNames.set(id, { query: source.query, names });
    return names;
  };

  const fetchSource = (
    source: DataSource,
    request: SourceRequest,
    signal: AbortSignal
  ): Promise<SourceData> => {
    if (source.type === 'esql') return runQuery(source.query, request, signal);
    if (!runCases) return Promise.reject(new Error('Cases cannot be shown here'));
    return runCases(source, request, signal);
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
    if (source === undefined) {
      state$.next({ status: 'error', message: `There is no query for "${id}"` });
      publishLoading();
      return;
    }

    const controller = new AbortController();
    entry.controller = controller;
    entry.appliedValues = Object.fromEntries(
      namesUsedBy(id, source).map((name) => [name, state[name]])
    );
    running.add(id);
    state$.next({ status: 'loading' });
    publishLoading();

    fetchSource(source, { context, state }, controller.signal)
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
    context$,
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
        if (!isEqual(previous[id], next[id])) start(id);
      });
    },
    setQueries: (next) => {
      const previous = sources;
      sources = Object.fromEntries(
        Object.entries(next).map(([id, query]) => [id, { type: 'esql' as const, query }])
      );
      entries.forEach((_entry, id) => {
        if (!isEqual(previous[id], sources[id])) start(id);
      });
    },
    setState: (next) => {
      state = next;
      entries.forEach((entry, id) => {
        const source = sources[id];
        if (source === undefined || entry.readers === 0) return;
        const changed = namesUsedBy(id, source).some(
          (name) => !isEqual(state[name], entry.appliedValues[name])
        );
        if (changed) start(id);
      });
    },
    refresh: (next) => {
      context = next;
      context$.next(next);
      startAll();
      publishLoading();
    },
    retry: startAll,
    destroy: () => {
      entries.forEach((entry, id) => stop(id, entry));
    },
  };
};

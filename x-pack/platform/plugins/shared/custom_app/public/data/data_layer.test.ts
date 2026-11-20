/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchContext } from '@kbn/presentation-publishing';
import type { CasesSource } from '@kbn/custom-app-common';
import {
  createDataLayer,
  type RunCases,
  type RunQuery,
  type SourceData,
  type SourceRequest,
} from './data_layer';

const context = { timeRange: { from: 'now-15m', to: 'now' } } as FetchContext;
const result = (value: number): SourceData => ({
  columns: [{ name: 'value', type: 'long' }],
  rows: [[value]],
});

interface Call {
  resolve: (data: SourceData) => void;
  reject: (error: Error) => void;
  signal: AbortSignal;
  query: string;
  request: SourceRequest;
}

/** A runQuery whose results the test settles by hand. */
const createControlledRunner = () => {
  const calls: Call[] = [];
  const runQuery: RunQuery = (query, request, signal) =>
    new Promise<SourceData>((resolve, reject) => {
      calls.push({ resolve, reject, signal, query, request });
    });
  return { runQuery, calls };
};

/** Stands in for the ES|QL parser: finds `?name` and `??name`. */
const getParameterNames = (query: string) =>
  Array.from(query.matchAll(/\?\??([A-Za-z_]\w*)/g), ([, name]) => name);

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const queries = {
  users: 'ROW users = 1',
  errors: 'ROW errors = 2',
  byService: 'FROM logs | WHERE service == ?service',
} as const;

const setup = () => {
  const { runQuery, calls } = createControlledRunner();
  const layer = createDataLayer({ runQuery, getParameterNames });
  layer.setQueries(queries);
  return { layer, calls };
};

describe('createDataLayer', () => {
  describe('demand', () => {
    it('runs nothing for a source that no node reads', () => {
      const { layer, calls } = setup();

      layer.refresh(context);

      expect(calls).toHaveLength(0);
    });

    it('runs a source once however many nodes read it', () => {
      const { layer, calls } = setup();
      layer.refresh(context);

      layer.acquire('users');
      layer.acquire('users');

      expect(calls.map(({ query }) => query)).toEqual(['ROW users = 1']);
    });

    it('waits for the first fetch context before running an acquired source', () => {
      const { layer, calls } = setup();

      layer.acquire('users');
      expect(calls).toHaveLength(0);

      layer.refresh(context);
      expect(calls).toHaveLength(1);
    });

    it('stops and resets a source when its last reader leaves, but not before', () => {
      const { layer, calls } = setup();
      layer.refresh(context);
      const releaseFirst = layer.acquire('users');
      const releaseSecond = layer.acquire('users');

      releaseFirst();
      expect(calls[0].signal.aborted).toBe(false);

      releaseSecond();
      expect(calls[0].signal.aborted).toBe(true);
      expect(layer.getSource$('users').getValue()).toEqual({ status: 'loading' });
    });

    it('ignores a release made twice', () => {
      const { layer, calls } = setup();
      layer.refresh(context);
      const release = layer.acquire('users');
      const other = layer.acquire('users');

      release();
      release();

      expect(calls[0].signal.aborted).toBe(false);
      other();
      expect(calls[0].signal.aborted).toBe(true);
    });

    it('runs again when a source is read again after its readers left', () => {
      const { layer, calls } = setup();
      layer.refresh(context);
      layer.acquire('users')();

      layer.acquire('users');

      expect(calls).toHaveLength(2);
    });

    it('only refreshes the queries being read', () => {
      const { layer, calls } = setup();
      layer.acquire('users');
      layer.refresh(context);
      layer.refresh(context);

      expect(calls.map(({ query }) => query)).toEqual(['ROW users = 1', 'ROW users = 1']);
    });
  });

  describe('results', () => {
    it('moves a source from loading to success', async () => {
      const { layer, calls } = setup();
      layer.refresh(context);
      layer.acquire('users');

      expect(layer.getSource$('users').getValue()).toEqual({ status: 'loading' });
      calls[0].resolve(result(1));
      await flush();

      expect(layer.getSource$('users').getValue()).toEqual({ status: 'success', data: result(1) });
    });

    it('keeps a failing source from affecting the others', async () => {
      const { layer, calls } = setup();
      layer.refresh(context);
      layer.acquire('users');
      layer.acquire('errors');

      calls[0].reject(new Error('Unknown column [users]'));
      calls[1].resolve(result(2));
      await flush();

      expect(layer.getSource$('users').getValue()).toEqual({
        status: 'error',
        message: 'Unknown column [users]',
      });
      expect(layer.getSource$('errors').getValue()).toEqual({
        status: 'success',
        data: result(2),
      });
    });

    it('aborts a run in flight on refresh and ignores its late result', async () => {
      const { layer, calls } = setup();
      layer.acquire('users');
      layer.refresh(context);
      layer.refresh(context);

      expect(calls[0].signal.aborted).toBe(true);
      expect(calls[1].signal.aborted).toBe(false);

      calls[0].resolve(result(111));
      await flush();
      expect(layer.getSource$('users').getValue()).toEqual({ status: 'loading' });

      calls[1].resolve(result(1));
      await flush();
      expect(layer.getSource$('users').getValue()).toEqual({ status: 'success', data: result(1) });
    });

    it('does not report an aborted run as an error', async () => {
      const { layer, calls } = setup();
      layer.acquire('users');
      layer.refresh(context);
      layer.refresh(context);

      calls[0].reject(new Error('aborted'));
      await flush();

      expect(layer.getSource$('users').getValue()).toEqual({ status: 'loading' });
    });

    it('retries what is being read, with the last context', async () => {
      const { layer, calls } = setup();
      layer.acquire('users');
      layer.refresh(context);
      calls[0].reject(new Error('boom'));
      await flush();

      layer.retry();
      expect(layer.getSource$('users').getValue()).toEqual({ status: 'loading' });
      calls[1].resolve(result(1));
      await flush();

      expect(layer.getSource$('users').getValue()).toEqual({ status: 'success', data: result(1) });
      expect(calls[1].request.context).toBe(context);
    });

    it('reports an error for a component with no query', () => {
      const { layer, calls } = setup();
      layer.refresh(context);

      layer.acquire('ghost');

      expect(calls).toHaveLength(0);
      expect(layer.getSource$('ghost').getValue()).toEqual({
        status: 'error',
        message: 'There is no query for "ghost"',
      });
    });
  });

  describe('state', () => {
    it('hands the current state to the query as the request', () => {
      const { layer, calls } = setup();
      layer.setState({ service: 'checkout', limit: 5 });
      layer.refresh(context);

      layer.acquire('byService');

      expect(calls[0].request.state).toEqual({ service: 'checkout', limit: 5 });
    });

    it('re-runs only the queries whose query uses a value that changed', () => {
      const { layer, calls } = setup();
      layer.setState({ service: 'checkout', limit: 5 });
      layer.refresh(context);
      layer.acquire('byService');
      layer.acquire('users');
      expect(calls).toHaveLength(2);

      layer.setState({ service: 'cart', limit: 5 });

      expect(calls.slice(2).map(({ query }) => query)).toEqual([
        'FROM logs | WHERE service == ?service',
      ]);
      expect(calls[3]).toBeUndefined();
    });

    it('does not re-run anything for a state key no query uses', () => {
      const { layer, calls } = setup();
      layer.setState({ service: 'checkout', limit: 5 });
      layer.refresh(context);
      layer.acquire('byService');

      layer.setState({ service: 'checkout', limit: 6 });

      expect(calls).toHaveLength(1);
    });

    it('does not re-run when the state is replaced by an equal one', () => {
      const { layer, calls } = setup();
      layer.setState({ service: 'checkout' });
      layer.refresh(context);
      layer.acquire('byService');

      layer.setState({ service: 'checkout' });

      expect(calls).toHaveLength(1);
    });

    it('does not run a source that is not being read when its parameter changes', () => {
      const { layer, calls } = setup();
      layer.setState({ service: 'checkout' });
      layer.refresh(context);

      layer.setState({ service: 'cart' });

      expect(calls).toHaveLength(0);
    });

    it('aborts the superseded run when a parameter changes mid-flight', () => {
      const { layer, calls } = setup();
      layer.setState({ service: 'checkout' });
      layer.refresh(context);
      layer.acquire('byService');

      layer.setState({ service: 'cart' });

      expect(calls[0].signal.aborted).toBe(true);
      expect(calls[1].request.state).toEqual({ service: 'cart' });
    });
  });

  describe('queries', () => {
    it('re-runs a source being read when its query changes, and leaves the others', () => {
      const { layer, calls } = setup();
      layer.refresh(context);
      layer.acquire('users');
      layer.acquire('errors');

      layer.setQueries({ ...queries, users: 'ROW users = 2' });

      expect(calls.slice(2).map(({ query }) => query)).toEqual(['ROW users = 2']);
    });
  });

  describe('loading', () => {
    it('reports loading until the first fetch', () => {
      const { layer } = setup();

      expect(layer.loading$.getValue()).toBe(true);
    });

    it('stops reporting loading after a fetch when nothing is being read', () => {
      const { layer } = setup();

      layer.refresh(context);

      expect(layer.loading$.getValue()).toBe(false);
    });

    it('reports loading while queries run and stops when all settle', async () => {
      const { layer, calls } = setup();
      layer.refresh(context);
      layer.acquire('users');
      layer.acquire('errors');
      expect(layer.loading$.getValue()).toBe(true);

      calls[0].resolve(result(1));
      await flush();
      expect(layer.loading$.getValue()).toBe(true);

      calls[1].resolve(result(2));
      await flush();
      expect(layer.loading$.getValue()).toBe(false);
    });

    it('reports loading again when a node starts reading a source later', () => {
      const { layer } = setup();
      layer.refresh(context);
      expect(layer.loading$.getValue()).toBe(false);

      layer.acquire('users');

      expect(layer.loading$.getValue()).toBe(true);
    });

    it('stops reporting loading when the only running source loses its reader', () => {
      const { layer } = setup();
      layer.refresh(context);
      const release = layer.acquire('users');

      release();

      expect(layer.loading$.getValue()).toBe(false);
    });
  });

  it('aborts everything in flight when destroyed', () => {
    const { layer, calls } = setup();
    layer.refresh(context);
    layer.acquire('users');
    layer.acquire('errors');

    layer.destroy();

    expect(calls.every(({ signal }) => signal.aborted)).toBe(true);
  });
});

describe('createDataLayer with a source of cases', () => {
  interface CasesCall {
    source: CasesSource;
    request: SourceRequest;
    resolve: (data: SourceData) => void;
  }

  const setupCases = () => {
    const queryRunner = createControlledRunner();
    const casesCalls: CasesCall[] = [];
    const runCases: RunCases = (source, request) =>
      new Promise<SourceData>((resolve) => {
        casesCalls.push({ source, request, resolve });
      });
    const layer = createDataLayer({ runQuery: queryRunner.runQuery, runCases, getParameterNames });
    return { layer, casesCalls, queryCalls: queryRunner.calls };
  };

  const open: CasesSource = { type: 'cases', status: { fromState: 'status' } };

  it('says where a component gets its data from, which is how a link can open its query', () => {
    const { layer } = setupCases();
    layer.setSources({ list: open, users: { type: 'esql', query: queries.users } });

    expect(layer.getSourceDefinition('users')).toEqual({ type: 'esql', query: queries.users });
    expect(layer.getSourceDefinition('list')).toEqual(open);
    expect(layer.getSourceDefinition('nope')).toBeUndefined();
  });

  it('runs the source of cases, and not a query, for a component that shows cases', () => {
    const { layer, casesCalls, queryCalls } = setupCases();
    layer.setSources({ list: open, users: { type: 'esql', query: queries.users } });
    layer.refresh(context);

    layer.acquire('list');

    expect(casesCalls.map(({ source }) => source)).toEqual([open]);
    expect(queryCalls).toHaveLength(0);
  });

  it('gives the cases to the component, and says it is loading until then', async () => {
    const { layer, casesCalls } = setupCases();
    layer.setSources({ list: open });
    layer.refresh(context);
    layer.acquire('list');
    expect(layer.getSource$('list').getValue()).toEqual({ status: 'loading' });

    casesCalls[0].resolve(result(3));
    await flush();

    expect(layer.getSource$('list').getValue()).toEqual({ status: 'success', data: result(3) });
  });

  it('hands the source the values of the app, as they are when it runs', () => {
    const { layer, casesCalls } = setupCases();
    layer.setSources({ list: open });
    layer.setState({ status: 'closed' });
    layer.refresh(context);

    layer.acquire('list');

    expect(casesCalls[0].request.state).toEqual({ status: 'closed' });
  });

  it('runs again when a value it is filtered by changes, and not for one it is not', () => {
    const { layer, casesCalls } = setupCases();
    layer.setSources({ list: open });
    layer.setState({ status: 'open', other: 'a' });
    layer.refresh(context);
    layer.acquire('list');
    expect(casesCalls).toHaveLength(1);

    layer.setState({ status: 'open', other: 'b' });
    expect(casesCalls).toHaveLength(1);

    layer.setState({ status: 'closed', other: 'b' });
    expect(casesCalls).toHaveLength(2);
  });

  it('runs again when the source itself is replaced by another, and not when it is by an equal one', () => {
    const { layer, casesCalls } = setupCases();
    layer.setSources({ list: open });
    layer.refresh(context);
    layer.acquire('list');
    expect(casesCalls).toHaveLength(1);

    layer.setSources({ list: { type: 'cases', status: { fromState: 'status' } } });
    expect(casesCalls).toHaveLength(1);

    layer.setSources({ list: { type: 'cases', status: 'open' } });
    expect(casesCalls).toHaveLength(2);
  });

  it('runs again, for the same source, when it changes between a query and cases', () => {
    const { layer, casesCalls, queryCalls } = setupCases();
    layer.setSources({ list: { type: 'esql', query: queries.users } });
    layer.refresh(context);
    layer.acquire('list');
    expect(queryCalls).toHaveLength(1);

    layer.setSources({ list: open });

    expect(casesCalls).toHaveLength(1);
  });

  it('says that cases cannot be shown when nothing can fetch them, instead of waiting for ever', async () => {
    const { runQuery } = createControlledRunner();
    const layer = createDataLayer({ runQuery, getParameterNames });
    layer.setSources({ list: open });
    layer.refresh(context);

    layer.acquire('list');
    await flush();

    expect(layer.getSource$('list').getValue()).toEqual({
      status: 'error',
      message: 'Cases cannot be shown here',
    });
  });

  it('says why when the cases could not be had, and does not affect the others', async () => {
    const queryRunner = createControlledRunner();
    const runCases: RunCases = () => Promise.reject(new Error('Forbidden'));
    const layer = createDataLayer({ runQuery: queryRunner.runQuery, runCases, getParameterNames });
    layer.setSources({ list: open, users: { type: 'esql', query: queries.users } });
    layer.refresh(context);

    layer.acquire('list');
    layer.acquire('users');
    queryRunner.calls[0].resolve(result(1));
    await flush();

    expect(layer.getSource$('list').getValue()).toEqual({ status: 'error', message: 'Forbidden' });
    expect(layer.getSource$('users').getValue()).toMatchObject({ status: 'success' });
  });

  it('keeps setQueries as a way to give only queries, as it has always been', () => {
    const { layer, queryCalls } = setupCases();
    layer.setQueries({ users: queries.users });
    layer.refresh(context);

    layer.acquire('users');

    expect(queryCalls.map(({ query }) => query)).toEqual([queries.users]);
  });
});

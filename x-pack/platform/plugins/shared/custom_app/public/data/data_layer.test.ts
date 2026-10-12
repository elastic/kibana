/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchContext } from '@kbn/presentation-publishing';
import { createDataLayer, type RunQuery, type SourceData } from './data_layer';

const context = { timeRange: { from: 'now-15m', to: 'now' } } as FetchContext;
const result = (value: number): SourceData => ({
  columns: [{ name: 'value', type: 'long' }],
  rows: [[value]],
});

interface Deferred {
  resolve: (data: SourceData) => void;
  reject: (error: Error) => void;
  signal: AbortSignal;
  query: string;
}

/** A runQuery whose results the test settles by hand. */
const createControlledRunner = () => {
  const calls: Deferred[] = [];
  const runQuery: RunQuery = (source, _context, signal) =>
    new Promise<SourceData>((resolve, reject) => {
      calls.push({ resolve, reject, signal, query: source.query });
    });
  return { runQuery, calls };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createDataLayer', () => {
  const sources = {
    users: { type: 'esql', query: 'ROW users = 1' },
    errors: { type: 'esql', query: 'ROW errors = 2' },
  } as const;

  it('runs nothing and reports loading until it has a fetch context', () => {
    const { runQuery, calls } = createControlledRunner();
    const layer = createDataLayer({ runQuery });

    layer.setSources(sources);

    expect(calls).toHaveLength(0);
    expect(layer.loading$.getValue()).toBe(true);
  });

  it('stops reporting loading after a fetch when the document has no sources', () => {
    const { runQuery } = createControlledRunner();
    const layer = createDataLayer({ runQuery });

    layer.refresh(context);

    expect(layer.loading$.getValue()).toBe(false);
  });

  it('runs each source once per refresh however many nodes read it', () => {
    const { runQuery, calls } = createControlledRunner();
    const layer = createDataLayer({ runQuery });
    layer.setSources(sources);

    layer.getSource$('users');
    layer.getSource$('users');
    layer.refresh(context);

    expect(calls.map(({ query }) => query)).toEqual(['ROW users = 1', 'ROW errors = 2']);
  });

  it('moves a source from loading to success and reports loading until all settle', async () => {
    const { runQuery, calls } = createControlledRunner();
    const layer = createDataLayer({ runQuery });
    layer.setSources(sources);
    layer.refresh(context);

    expect(layer.getSource$('users').getValue()).toEqual({ status: 'loading' });
    expect(layer.loading$.getValue()).toBe(true);

    calls[0].resolve(result(1));
    await flush();
    expect(layer.getSource$('users').getValue()).toEqual({ status: 'success', data: result(1) });
    expect(layer.loading$.getValue()).toBe(true);

    calls[1].resolve(result(2));
    await flush();
    expect(layer.loading$.getValue()).toBe(false);
  });

  it('keeps a failing source from affecting the others', async () => {
    const { runQuery, calls } = createControlledRunner();
    const layer = createDataLayer({ runQuery });
    layer.setSources(sources);
    layer.refresh(context);

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
    expect(layer.loading$.getValue()).toBe(false);
  });

  it('aborts a run in flight on refresh and ignores its late result', async () => {
    const { runQuery, calls } = createControlledRunner();
    const layer = createDataLayer({ runQuery });
    layer.setSources({ users: sources.users });
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
    expect(layer.loading$.getValue()).toBe(false);
  });

  it('does not report an aborted run as an error', async () => {
    const { runQuery, calls } = createControlledRunner();
    const layer = createDataLayer({ runQuery });
    layer.setSources({ users: sources.users });
    layer.refresh(context);
    layer.refresh(context);

    calls[0].reject(new Error('aborted'));
    await flush();

    expect(layer.getSource$('users').getValue()).toEqual({ status: 'loading' });
  });

  it('reruns when the sources change after a first fetch', () => {
    const { runQuery, calls } = createControlledRunner();
    const layer = createDataLayer({ runQuery });
    layer.refresh(context);
    expect(calls).toHaveLength(0);

    layer.setSources({ users: sources.users });

    expect(calls.map(({ query }) => query)).toEqual(['ROW users = 1']);
  });

  it('retries with the last context after a failure', async () => {
    const { runQuery, calls } = createControlledRunner();
    const layer = createDataLayer({ runQuery });
    layer.setSources({ users: sources.users });
    layer.refresh(context);
    calls[0].reject(new Error('boom'));
    await flush();

    layer.retry();
    expect(layer.getSource$('users').getValue()).toEqual({ status: 'loading' });
    calls[1].resolve(result(1));
    await flush();

    expect(layer.getSource$('users').getValue()).toEqual({ status: 'success', data: result(1) });
  });

  it('aborts in-flight queries when destroyed', () => {
    const { runQuery, calls } = createControlledRunner();
    const layer = createDataLayer({ runQuery });
    layer.setSources({ users: sources.users });
    layer.refresh(context);

    layer.destroy();

    expect(calls[0].signal.aborted).toBe(true);
  });
});

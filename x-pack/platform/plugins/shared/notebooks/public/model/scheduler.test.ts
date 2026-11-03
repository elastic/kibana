/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { DatatableRow } from '@kbn/expressions-plugin/common';
import type {
  CellDefinition,
  ChartCellDefinition,
  EsqlCellDefinition,
  InputCellDefinition,
  InputDefinition,
  LensAttributes,
} from '../../common/types';
import { NotebookStore } from './notebook_store';
import { NotebookScheduler } from './scheduler';
import type { CellOutput, RunQuery, RunQueryArgs } from './types';

interface FakeCall extends RunQueryArgs {
  respond: (rows?: DatatableRow[]) => void;
  fail: (message: string) => void;
}

const createFakeRunQuery = () => {
  const calls: FakeCall[] = [];
  const rowsByQuery = new Map<string, DatatableRow[]>();
  const failures = new Map<string, string>();
  let deferred = false;

  const runQuery: RunQuery = (args) =>
    new Promise((resolve, reject) => {
      const respond = (
        rows: DatatableRow[] = rowsByQuery.get(args.query) ?? [
          { query: args.query, params: JSON.stringify(args.params) },
        ]
      ) =>
        resolve({
          table: {
            type: 'datatable',
            columns: Object.keys(rows[0] ?? {}).map((id) => ({
              id,
              name: id,
              meta: { type: 'string' },
            })),
            rows,
          },
          durationMs: 7,
          truncated: false,
        });
      const fail = (message: string) => reject(new Error(message));
      calls.push({ ...args, respond, fail });
      if (deferred) return;
      const failure = failures.get(args.query);
      if (failure) fail(failure);
      else respond();
    });

  return {
    runQuery,
    calls,
    callsFor: (query: string) => calls.filter((call) => call.query === query),
    setDeferred: (value: boolean) => {
      deferred = value;
    },
    setRows: (query: string, rows: DatatableRow[]) => rowsByQuery.set(query, rows),
    failQuery: (query: string, message: string) => failures.set(query, message),
  };
};

const esql = (
  id: string,
  query: string,
  overrides: Partial<EsqlCellDefinition> = {}
): EsqlCellDefinition => ({ id, name: id, type: 'esql', runMode: 'auto', query, ...overrides });

const chart = (
  id: string,
  sourceCell: string | null,
  overrides: Partial<ChartCellDefinition> = {}
): ChartCellDefinition => ({
  id,
  name: id,
  type: 'chart',
  runMode: 'auto',
  sourceCell,
  lensAttributes: null,
  ...overrides,
});

const input = (id: string, definition: InputDefinition): InputCellDefinition => ({
  id,
  name: id,
  type: 'input',
  input: definition,
});

const pinnedTime = (id: string, from = 'now-15m', to = 'now') =>
  input(id, { kind: 'time', pinned: true, defaultValue: { from, to } });

const dropdown = (id: string, optionsQuery = '', defaultValue: string | null = null) =>
  input(id, { kind: 'dropdown', optionsQuery, defaultValue });

const range = (id: string, defaultValue: [number, number] | null = null) =>
  input(id, { kind: 'range', min: 0, max: 100, defaultValue });

const lensAttributes = (title: string): LensAttributes => ({
  title,
  visualizationType: 'lnsXY',
  references: [],
  state: {
    datasourceStates: {},
    visualization: {},
    query: { query: '', language: 'kuery' },
    filters: [],
  },
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const NOW = new Date('2026-10-29T12:00:00.000Z');

const setup = (cells: CellDefinition[]) => {
  const store = new NotebookStore({
    title: 'Notebook',
    cellOrder: cells.map(({ id }) => id),
    cells: Object.fromEntries(cells.map((cell) => [cell.id, cell])),
  });
  const fake = createFakeRunQuery();
  const clock = { now: NOW };
  const scheduler = new NotebookScheduler(store, {
    runQuery: fake.runQuery,
    now: () => clock.now,
  });
  const runtime = (id: string) => store.getRuntime(id);
  const output = (id: string): CellOutput | undefined => store.getRuntime(id).output;
  const countEmissions = (id: string) => {
    let count = -1;
    const subscription = store.getRuntime$(id).subscribe(() => count++);
    return {
      get count() {
        return count;
      },
      unsubscribe: () => subscription.unsubscribe(),
    };
  };
  const open = async () => {
    scheduler.start();
    await scheduler.whenIdle();
  };
  return { store, fake, clock, scheduler, runtime, output, countEmissions, open };
};

const tableRows = (cellOutput: CellOutput | undefined): DatatableRow[] =>
  cellOutput?.kind === 'table' ? cellOutput.table.rows : [];

let active: NotebookScheduler[] = [];
const track = <T extends { scheduler: NotebookScheduler }>(env: T): T => {
  active.push(env.scheduler);
  return env;
};

afterEach(() => {
  active.forEach((scheduler) => scheduler.stop());
  active = [];
});

describe('NotebookScheduler', () => {
  describe('notebook open', () => {
    it('runs auto cells in dependency order and feeds charts the source output', async () => {
      const query = 'FROM logs | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend';
      const env = track(setup([chart('c', 'q'), esql('q', query), pinnedTime('time')]));
      await env.open();

      expect(env.fake.calls.map(({ query: q, params }) => ({ q, params }))).toEqual([
        {
          q: query,
          params: { _tstart: '2026-10-29T11:45:00.000Z', _tend: '2026-10-29T12:00:00.000Z' },
        },
      ]);
      expect(env.runtime('q')).toMatchObject({
        status: 'done',
        output: { kind: 'table', truncated: false },
        durationMs: 7,
      });
      expect(env.runtime('q').lastRunAt).toEqual(expect.any(Number));
      expect(env.runtime('c').status).toBe('done');
      expect(env.output('c')).toBe(env.output('q'));
    });

    it('runs independent branches concurrently', async () => {
      const env = track(setup([esql('a', 'FROM a'), esql('b', 'FROM b')]));
      env.fake.setDeferred(true);
      env.scheduler.start();
      await flush();

      expect(env.fake.calls.map(({ query }) => query).sort()).toEqual(['FROM a', 'FROM b']);
      expect(env.runtime('a').status).toBe('running');
      expect(env.runtime('b').status).toBe('running');
      env.fake.calls.forEach((call) => call.respond());
      await env.scheduler.whenIdle();
      expect(env.runtime('a').status).toBe('done');
      expect(env.runtime('b').status).toBe('done');
    });

    it('leaves manual cells stale with no output, and their charts stale too', async () => {
      const env = track(setup([esql('q', 'FROM logs', { runMode: 'manual' }), chart('c', 'q')]));
      await env.open();

      expect(env.fake.calls).toHaveLength(0);
      expect(env.runtime('q')).toEqual({ status: 'stale', staleReason: 'manual' });
      expect(env.runtime('c')).toEqual({
        status: 'stale',
        staleReason: 'upstream',
        staleParents: ['q'],
      });
    });

    it('leaves a blank query and its chart idle without running anything', async () => {
      const env = track(setup([esql('q', '  '), chart('c', 'q'), chart('unset', null)]));
      await env.open();

      expect(env.fake.calls).toHaveLength(0);
      expect(env.runtime('q').status).toBe('idle');
      expect(env.runtime('c').status).toBe('idle');
      expect(env.runtime('unset').status).toBe('idle');
    });
  });

  describe('propagation', () => {
    it('re-runs only the descendants of a changed input', async () => {
      const osQuery = 'FROM logs | WHERE ?os IS NULL OR os == ?os';
      const timeQuery = 'FROM logs | WHERE @timestamp >= ?_tstart';
      const env = track(
        setup([
          pinnedTime('time'),
          dropdown('os'),
          esql('by_os', osQuery),
          esql('all', 'FROM logs'),
          esql('timed', timeQuery),
          chart('os_chart', 'by_os'),
          chart('all_chart', 'all'),
        ])
      );
      await env.open();
      const allOutput = env.output('all');
      const allEmissions = env.countEmissions('all');
      const allChartEmissions = env.countEmissions('all_chart');

      env.clock.now = new Date('2026-10-29T12:05:00.000Z');
      env.store.setInputValue('os', { kind: 'dropdown', value: 'win 7' });
      await env.scheduler.whenIdle();

      expect(env.fake.callsFor('FROM logs')).toHaveLength(1);
      expect(env.fake.callsFor(timeQuery)).toHaveLength(1);
      expect(env.fake.callsFor(osQuery).map(({ params }) => params)).toEqual([
        { os: null },
        { os: 'win 7' },
      ]);
      expect(env.output('all')).toBe(allOutput);
      expect(allEmissions.count).toBe(0);
      expect(allChartEmissions.count).toBe(0);
      expect(env.output('os_chart')).toBe(env.output('by_os'));
      expect(tableRows(env.output('by_os'))[0].params).toBe(JSON.stringify({ os: 'win 7' }));
    });

    it('skips the run when the params a cell reads did not change', async () => {
      const minQuery = 'FROM logs | WHERE bytes >= ?bytes_min';
      const maxQuery = 'FROM logs | WHERE bytes <= ?bytes_max';
      const env = track(
        setup([
          range('bytes', [10, 20]),
          esql('above', minQuery),
          esql('below', maxQuery),
          chart('above_chart', 'above'),
        ])
      );
      await env.open();
      const aboveRuntime = env.runtime('above');
      const aboveChartRuntime = env.runtime('above_chart');

      env.store.setInputValue('bytes', { kind: 'range', value: [10, 30] });
      await env.scheduler.whenIdle();

      expect(env.fake.callsFor(minQuery)).toHaveLength(1);
      expect(env.fake.callsFor(maxQuery).map(({ params }) => params)).toEqual([
        { bytes_max: 20 },
        { bytes_max: 30 },
      ]);
      expect(env.runtime('above')).toBe(aboveRuntime);
      expect(env.runtime('above_chart')).toBe(aboveChartRuntime);
    });

    it('aborts an in-flight run when re-triggered and keeps only the latest result', async () => {
      const query = 'FROM logs | WHERE ?os IS NULL OR os == ?os';
      const env = track(setup([dropdown('os'), esql('q', query), chart('c', 'q')]));
      env.fake.setDeferred(true);
      env.scheduler.start();
      await flush();
      const [first] = env.fake.calls;

      env.store.setInputValue('os', { kind: 'dropdown', value: 'mac' });
      await flush();
      const [, second] = env.fake.calls;

      expect(first.signal.aborted).toBe(true);
      expect(second.signal.aborted).toBe(false);
      second.respond();
      await env.scheduler.whenIdle();
      first.respond();
      first.fail('The operation was aborted');
      await flush();

      expect(env.runtime('q').status).toBe('done');
      expect(env.runtime('q').error).toBeUndefined();
      expect(tableRows(env.output('q'))[0].params).toBe(JSON.stringify({ os: 'mac' }));
      expect(env.output('c')).toBe(env.output('q'));
    });

    it('ignores the error of a superseded run', async () => {
      const query = 'FROM logs | WHERE ?os IS NULL OR os == ?os';
      const env = track(setup([dropdown('os'), esql('q', query)]));
      env.fake.setDeferred(true);
      env.scheduler.start();
      await flush();
      env.store.setInputValue('os', { kind: 'dropdown', value: 'mac' });
      await flush();
      const [first, second] = env.fake.calls;

      first.fail('The operation was aborted');
      await flush();
      expect(env.runtime('q').status).toBe('running');
      second.respond();
      await env.scheduler.whenIdle();
      expect(env.runtime('q').status).toBe('done');
    });

    it('aborts the run of a removed cell', async () => {
      const env = track(setup([esql('q', 'FROM logs')]));
      env.fake.setDeferred(true);
      env.scheduler.start();
      await flush();

      env.store.removeCell('q');
      await env.scheduler.whenIdle();
      expect(env.fake.calls[0].signal.aborted).toBe(true);
    });

    it('re-points a chart to its new source without running a query', async () => {
      const env = track(setup([esql('a', 'FROM a'), esql('b', 'FROM b'), chart('c', 'a')]));
      await env.open();

      env.store.updateCell('c', (cell) => ({ ...cell, sourceCell: 'b' }));
      await env.scheduler.whenIdle();

      expect(env.fake.calls).toHaveLength(2);
      expect(env.output('c')).toBe(env.output('b'));
    });

    it('runs a newly added cell', async () => {
      const env = track(setup([esql('a', 'FROM a')]));
      await env.open();

      env.store.addCell(chart('c', 'a'));
      await env.scheduler.whenIdle();
      expect(env.output('c')).toBe(env.output('a'));
    });
  });

  describe('errors', () => {
    it('blocks descendants of a failed query and recovers once it is fixed', async () => {
      const env = track(setup([esql('q', 'FROM broken'), chart('c', 'q')]));
      env.fake.failQuery('FROM broken', 'Unknown index [broken]');
      await env.open();

      expect(env.runtime('q')).toEqual({ status: 'error', error: 'Unknown index [broken]' });
      expect(env.runtime('c').status).toBe('blocked');

      env.store.updateCell('q', (cell) => ({ ...cell, query: 'FROM logs' }));
      await env.scheduler.runCell('q');

      expect(env.runtime('q').status).toBe('done');
      expect(env.runtime('c').status).toBe('done');
      expect(env.output('c')).toBe(env.output('q'));
    });

    it('never runs a query whose input failed to resolve', async () => {
      const query = 'FROM logs | WHERE @timestamp >= ?_tstart';
      const env = track(setup([pinnedTime('time', 'yesterday'), esql('q', query)]));
      await env.open();

      expect(env.runtime('time').status).toBe('error');
      expect(env.runtime('time').error).toMatch(/yesterday/);
      expect(env.runtime('q').status).toBe('blocked');
      expect(env.fake.calls).toHaveLength(0);
    });

    it('reports cycles and unknown params as cell errors and blocks their consumers', async () => {
      const env = track(
        setup([
          dropdown('a', 'FROM x | WHERE y == ?b | STATS BY y'),
          dropdown('b', 'FROM x | WHERE y == ?a | STATS BY y'),
          esql('uses_a', 'FROM x | WHERE y == ?a'),
          esql('unknown', 'FROM x | WHERE y == ?missing'),
          chart('unknown_chart', 'unknown'),
        ])
      );
      await env.open();

      expect(env.runtime('a').status).toBe('error');
      expect(env.runtime('b').status).toBe('error');
      expect(env.runtime('uses_a').status).toBe('blocked');
      expect(env.runtime('unknown')).toMatchObject({
        status: 'error',
        error: expect.stringContaining('?missing'),
      });
      expect(env.runtime('unknown_chart').status).toBe('blocked');
      expect(env.fake.calls).toHaveLength(0);
    });

    it('breaks ?oldName consumers when an input is renamed, and recovers on rename back', async () => {
      const query = 'FROM logs | WHERE ?os IS NULL OR os == ?os';
      const env = track(setup([dropdown('os'), esql('q', query), chart('c', 'q')]));
      await env.open();
      const qOutput = env.output('q');

      env.store.updateCell('os', (cell) => ({ ...cell, name: 'country' }));
      await env.scheduler.whenIdle();

      expect(env.runtime('q')).toMatchObject({
        status: 'error',
        error: expect.stringContaining('?os'),
      });
      expect(env.runtime('c').status).toBe('blocked');

      env.store.updateCell('os', (cell) => ({ ...cell, name: 'os' }));
      await env.scheduler.whenIdle();

      expect(env.runtime('q').status).toBe('done');
      expect(env.runtime('q').error).toBeUndefined();
      expect(env.runtime('c').status).toBe('done');
      expect(env.output('q')).toBe(qOutput);
      expect(env.output('c')).toBe(qOutput);
      expect(env.fake.callsFor(query)).toHaveLength(1);
    });

    it('breaks ?_tstart consumers when the global time picker is disabled, and reruns them on enable', async () => {
      const query = 'FROM logs | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend';
      const env = track(
        setup([pinnedTime('time'), esql('q', query), chart('c', 'q'), esql('other', 'FROM x')])
      );
      await env.open();

      env.store.setGlobalTimePicker(false);
      await env.scheduler.whenIdle();

      expect(env.runtime('q')).toMatchObject({
        status: 'error',
        error: expect.stringContaining('?_tstart'),
      });
      expect(env.runtime('c').status).toBe('blocked');
      expect(env.runtime('other').status).toBe('done');

      env.store.setGlobalTimePicker(true);
      await env.scheduler.whenIdle();

      expect(env.runtime('q').status).toBe('done');
      expect(env.runtime('c').status).toBe('done');
      expect(env.fake.callsFor(query)).toHaveLength(2);
      expect(env.fake.callsFor(query)[1].params).toEqual({
        _tstart: dateMath.parse('now-7d/d', { forceNow: NOW })?.toISOString(),
        _tend: '2026-10-29T12:00:00.000Z',
      });
      expect(env.fake.callsFor('FROM x')).toHaveLength(1);
    });
  });

  describe('metadata edits', () => {
    it('does not re-run or re-emit when an ES|QL cell is renamed or Lens attributes change', async () => {
      const env = track(setup([esql('q', 'FROM logs'), chart('c', 'q')]));
      await env.open();
      const qEmissions = env.countEmissions('q');
      const cEmissions = env.countEmissions('c');

      env.store.updateCell('q', (cell) => ({ ...cell, name: 'renamed' }));
      env.store.updateCell('c', (cell) => ({ ...cell, lensAttributes: lensAttributes('Count') }));
      env.store.updateCell('c', (cell) => ({ ...cell, name: 'chart_renamed' }));
      await env.scheduler.whenIdle();

      expect(env.fake.calls).toHaveLength(1);
      expect(qEmissions.count).toBe(0);
      expect(cEmissions.count).toBe(0);
    });

    it('does not run when a query is edited until the cell is run', async () => {
      const env = track(setup([esql('q', 'FROM logs')]));
      await env.open();

      env.store.updateCell('q', (cell) => ({ ...cell, query: 'FROM metrics' }));
      await env.scheduler.whenIdle();
      expect(env.fake.calls.map(({ query }) => query)).toEqual(['FROM logs']);

      await env.scheduler.runCell('q');
      expect(env.fake.calls.map(({ query }) => query)).toEqual(['FROM logs', 'FROM metrics']);
    });

    it('marks an edited query and its charts stale, keeping outputs, until it is run', async () => {
      const env = track(setup([esql('q', 'FROM logs'), chart('c', 'q')]));
      await env.open();
      const qOutput = env.output('q');

      env.scheduler.markEdited('q', true);
      await env.scheduler.whenIdle();

      expect(env.runtime('q')).toMatchObject({ status: 'stale', staleReason: 'edited' });
      expect(env.runtime('c')).toMatchObject({
        status: 'stale',
        staleReason: 'upstream',
        staleParents: ['q'],
      });
      expect(env.output('q')).toBe(qOutput);
      expect(env.output('c')).toBe(qOutput);

      env.store.updateCell('q', (cell) => ({ ...cell, query: 'FROM metrics' }));
      await env.scheduler.runCell('q');

      expect(env.fake.calls.map(({ query }) => query)).toEqual(['FROM logs', 'FROM metrics']);
      expect(env.runtime('q').status).toBe('done');
      expect(env.runtime('c').status).toBe('done');
      expect(env.runtime('q').staleReason).toBeUndefined();
      expect(env.runtime('c').staleReason).toBeUndefined();
      expect(env.runtime('c').staleParents).toBeUndefined();
    });

    it('returns an edited query to done without running when the edit is reverted', async () => {
      const env = track(setup([esql('q', 'FROM logs'), chart('c', 'q')]));
      await env.open();

      env.scheduler.markEdited('q', true);
      await env.scheduler.whenIdle();
      env.scheduler.markEdited('q', false);
      await env.scheduler.whenIdle();

      expect(env.runtime('q').status).toBe('done');
      expect(env.runtime('c').status).toBe('done');
      expect(env.fake.calls).toHaveLength(1);
    });

    it('keeps an edited query stale on input changes and Run all', async () => {
      const query = 'FROM logs | WHERE ?os IS NULL OR os == ?os';
      const env = track(setup([dropdown('os'), esql('q', query)]));
      await env.open();

      env.scheduler.markEdited('q', true);
      env.store.setInputValue('os', { kind: 'dropdown', value: 'win 7' });
      await env.scheduler.whenIdle();
      expect(env.runtime('q').status).toBe('stale');

      await env.scheduler.runAll();
      expect(env.runtime('q').status).toBe('stale');
      expect(env.fake.callsFor(query)).toHaveLength(1);
    });
  });

  describe('manual run mode', () => {
    it('marks a manual cell and its charts stale on input change, keeping their outputs', async () => {
      const query = 'FROM logs | WHERE ?os IS NULL OR os == ?os';
      const env = track(
        setup([dropdown('os'), esql('q', query, { runMode: 'manual' }), chart('c', 'q')])
      );
      await env.open();
      await env.scheduler.runCell('q');
      const qOutput = env.output('q');
      expect(env.runtime('q').status).toBe('done');
      expect(env.output('c')).toBe(qOutput);

      env.store.setInputValue('os', { kind: 'dropdown', value: 'win 7' });
      await env.scheduler.whenIdle();

      expect(env.runtime('q')).toMatchObject({ status: 'stale', staleReason: 'manual' });
      expect(env.runtime('c')).toMatchObject({
        status: 'stale',
        staleReason: 'upstream',
        staleParents: ['q'],
      });
      expect(env.output('q')).toBe(qOutput);
      expect(env.output('c')).toBe(qOutput);
      expect(env.fake.callsFor(query)).toHaveLength(1);

      await env.scheduler.runCell('q');

      expect(env.fake.callsFor(query).map(({ params }) => params)).toEqual([
        { os: null },
        { os: 'win 7' },
      ]);
      expect(env.runtime('q').status).toBe('done');
      expect(env.runtime('c').status).toBe('done');
      expect(env.output('c')).toBe(env.output('q'));
      expect(env.output('c')).not.toBe(qOutput);
    });

    it('returns a manual cell to done when its inputs change back', async () => {
      const query = 'FROM logs | WHERE ?os IS NULL OR os == ?os';
      const env = track(setup([dropdown('os'), esql('q', query, { runMode: 'manual' })]));
      await env.open();
      await env.scheduler.runCell('q');
      const qOutput = env.output('q');

      env.store.setInputValue('os', { kind: 'dropdown', value: 'win 7' });
      await env.scheduler.whenIdle();
      env.store.setInputValue('os', { kind: 'dropdown', value: null });
      await env.scheduler.whenIdle();

      expect(env.runtime('q').status).toBe('done');
      expect(env.output('q')).toBe(qOutput);
      expect(env.fake.callsFor(query)).toHaveLength(1);
    });

    it('keeps a manual chart stale until it is run', async () => {
      const env = track(setup([esql('q', 'FROM logs'), chart('c', 'q', { runMode: 'manual' })]));
      await env.open();
      expect(env.runtime('c')).toEqual({ status: 'stale', staleReason: 'manual' });

      await env.scheduler.runCell('c');
      expect(env.runtime('c').status).toBe('done');
      expect(env.output('c')).toBe(env.output('q'));
      expect(env.fake.calls).toHaveLength(1);
    });

    it('runs a stale manual cell when it is switched to auto', async () => {
      const env = track(setup([esql('q', 'FROM logs', { runMode: 'manual' })]));
      await env.open();

      env.store.updateCell('q', (cell) => ({ ...cell, runMode: 'auto' }));
      await env.scheduler.whenIdle();
      expect(env.runtime('q').status).toBe('done');
      expect(env.fake.calls).toHaveLength(1);
    });
  });

  describe('header commands', () => {
    it('runCell re-runs an up-to-date cell and pushes the new output to its charts', async () => {
      const env = track(setup([esql('q', 'FROM logs'), chart('c', 'q')]));
      await env.open();
      const before = env.output('q');

      await env.scheduler.runCell('q');

      expect(env.fake.calls).toHaveLength(2);
      expect(env.output('q')).not.toBe(before);
      expect(env.output('c')).toBe(env.output('q'));
    });

    it('runAll re-runs every query, manual ones included', async () => {
      const env = track(
        setup([
          esql('a', 'FROM a'),
          esql('b', 'FROM b', { runMode: 'manual' }),
          chart('cb', 'b', { runMode: 'manual' }),
        ])
      );
      await env.open();

      await env.scheduler.runAll();

      expect(env.fake.calls.map(({ query }) => query).sort()).toEqual([
        'FROM a',
        'FROM a',
        'FROM b',
      ]);
      expect(env.runtime('b').status).toBe('done');
      expect(env.output('cb')).toBe(env.output('b'));
    });

    it('refresh re-resolves relative time and re-runs only time-bound cells', async () => {
      const timeQuery = 'FROM logs | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend';
      const env = track(
        setup([pinnedTime('time'), esql('timed', timeQuery), esql('static', 'FROM logs')])
      );
      await env.open();

      env.clock.now = new Date('2026-10-29T12:05:00.000Z');
      await env.scheduler.refresh();

      expect(env.fake.callsFor(timeQuery).map(({ params }) => params)).toEqual([
        { _tstart: '2026-10-29T11:45:00.000Z', _tend: '2026-10-29T12:00:00.000Z' },
        { _tstart: '2026-10-29T11:50:00.000Z', _tend: '2026-10-29T12:05:00.000Z' },
      ]);
      expect(env.fake.callsFor('FROM logs')).toHaveLength(1);
    });
  });

  describe('params and inputs', () => {
    it('binds null for an empty dropdown and range, and values once set', async () => {
      const query =
        'FROM logs | WHERE (?os IS NULL OR os == ?os) AND (?bytes_min IS NULL OR bytes >= ?bytes_min) AND (?bytes_max IS NULL OR bytes <= ?bytes_max)';
      const env = track(setup([dropdown('os'), range('bytes'), esql('q', query)]));
      await env.open();

      env.store.setInputValue('bytes', { kind: 'range', value: [100, 500] });
      await env.scheduler.whenIdle();

      expect(env.fake.callsFor(query).map(({ params }) => params)).toEqual([
        { os: null, bytes_min: null, bytes_max: null },
        { os: null, bytes_min: 100, bytes_max: 500 },
      ]);
    });

    it('loads dropdown options from the first column of its options query', async () => {
      const optionsQuery = 'FROM logs | WHERE @timestamp >= ?_tstart | STATS c = COUNT() BY os';
      const env = track(setup([pinnedTime('time'), dropdown('os', optionsQuery, 'win')]));
      env.fake.setRows(optionsQuery, [
        { os: 'win', c: 3 },
        { os: 'mac', c: 2 },
        { os: 'win', c: 1 },
        { os: null, c: 1 },
        { os: 7, c: 1 },
      ]);
      await env.open();

      expect(env.fake.callsFor(optionsQuery).map(({ params }) => params)).toEqual([
        { _tstart: '2026-10-29T11:45:00.000Z' },
      ]);
      expect(env.runtime('os')).toMatchObject({
        status: 'done',
        output: { kind: 'input', params: { os: 'win' }, options: ['win', 'mac', '7'] },
      });

      env.store.setInputValue('os', { kind: 'dropdown', value: 'mac' });
      await env.scheduler.whenIdle();

      expect(env.fake.callsFor(optionsQuery)).toHaveLength(1);
      expect(env.output('os')).toEqual({
        kind: 'input',
        params: { os: 'mac' },
        options: ['win', 'mac', '7'],
      });
    });

    it('records a run time only for inputs that ran a query', async () => {
      const env = track(
        setup([
          pinnedTime('time'),
          range('bytes'),
          dropdown('static_choice'),
          dropdown('os', 'FROM logs | STATS BY os'),
        ])
      );
      await env.open();

      expect(env.runtime('time').lastRunAt).toBeUndefined();
      expect(env.runtime('bytes').lastRunAt).toBeUndefined();
      expect(env.runtime('static_choice').lastRunAt).toBeUndefined();
      expect(env.runtime('os').lastRunAt).toEqual(expect.any(Number));
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Vm from 'vm';
import {
  allChartsHaveDebugState,
  centerPanel,
  listRenderedPanelIds,
  readInspectorTables,
  readPanel,
  readRenderContext,
} from './browser_readers';

/**
 * `browser.execute` sends a function's source text, so rebuild each reader from its text alone, in a
 * context that only has the page's globals: this fails if a reader reaches for module scope (an
 * import, a helper, a transpiler shim).
 */
const fromSource = <T extends (...args: never[]) => unknown>(reader: T): T =>
  Vm.runInNewContext(`(${reader.toString()})`, {
    document,
    window,
    navigator,
    Intl,
  });

const debugState = {
  axes: { x: [{ id: 'x', labels: ['a', 'b'] }] },
  legend: { items: [{ name: 'Count', color: '#16C5C0' }] },
};

const renderInspectorPanel = (): Element => {
  document.body.innerHTML = '<div data-test-subj="inspectorPanel"></div>';
  const element = document.body.firstElementChild;
  if (!element) {
    throw new Error('Inspector panel did not render');
  }
  return element;
};

describe('browser readers', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('readPanel', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="panel-p1">
          <div data-render-complete="true">
            <span data-test-subj="embeddablePanelTitle"> Requests </span>
            <div class="echChart">
              <div class="echChartStatus" data-ech-render-complete="true" data-ech-render-count="2"></div>
            </div>
            <div class="echMetric" aria-label="Metric" style="background-color: rgb(1, 2, 3);">
              <h2 class="echMetricText__title">Bytes</h2>
              <p class="echMetricText__value" style="color: rgb(255, 0, 0);">1.2 <span>KB</span></p>
            </div>
            <div class="euiDataGrid">
              <div role="grid" aria-rowcount="12" aria-colcount="2">
                <div role="columnheader">Category</div>
                <div role="columnheader">Count</div>
                <div role="gridcell" data-gridcell-row-index="0" data-gridcell-column-index="0">alpha</div>
                <div role="gridcell" data-gridcell-row-index="0" data-gridcell-column-index="1"
                  style="background-color: rgb(0, 128, 0);">42</div>
              </div>
            </div>
          </div>
        </div>`;
      document
        .querySelector('.echChartStatus')
        ?.setAttribute('data-ech-debug-state', JSON.stringify(debugState));
    });

    it('reads title, DebugState, metric and data grid', () => {
      const reading = JSON.parse(fromSource(readPanel)('p1'));

      expect(reading.found).toBe(true);
      expect(reading.title).toBe('Requests');
      expect(reading.renderComplete).toBe(true);
      expect(reading.charts).toEqual([
        expect.objectContaining({ renderComplete: true, renderCount: 2, debugState }),
      ]);

      const [metric] = reading.metrics;
      expect(metric.ariaLabel).toBe('Metric');
      expect(metric.inlineBackgroundColor).toBe('rgb(1, 2, 3)');
      expect(
        metric.texts.map(({ text, inlineColor }: { text: string; inlineColor: string }) => [
          text,
          inlineColor,
        ])
      ).toEqual([
        ['Bytes', ''],
        ['1.2 KB', 'rgb(255, 0, 0)'],
        ['KB', ''],
      ]);

      const [grid] = reading.dataGrids;
      expect(grid.rowCount).toBe(12);
      expect(grid.columnCount).toBe(2);
      expect(grid.headers.map(({ text }: { text: string }) => text)).toEqual(['Category', 'Count']);
      expect(grid.cells).toEqual([
        expect.objectContaining({ row: 0, column: 0, text: 'alpha' }),
        expect.objectContaining({
          row: 0,
          column: 1,
          text: '42',
          inlineBackgroundColor: 'rgb(0, 128, 0)',
        }),
      ]);
    });

    it('reports a panel that is not on the page', () => {
      expect(JSON.parse(fromSource(readPanel)('missing'))).toEqual(
        expect.objectContaining({ found: false, charts: [] })
      );
    });
  });

  describe('readInspectorTables', () => {
    const attachFiber = (element: Element, adapters: object) => {
      const inspectorPanelFiber = { memoizedProps: { adapters }, return: null };
      const hostFiber = { memoizedProps: { className: 'x' }, return: inspectorPanelFiber };
      Object.assign(element, { __reactFiber$test: hostFiber });
    };

    it('finds the adapters from an element inside the flyout, in a separate React root', () => {
      const element = renderInspectorPanel();
      element.innerHTML = '<div><span>Data</span></div>';
      Object.assign(element, { __reactFiber$test: { memoizedProps: {}, return: null } });
      const inner = element.querySelector('span');
      if (!inner) {
        throw new Error('Inspector content did not render');
      }
      attachFiber(inner, { tables: { tables: { layer: { rows: [] } } } });

      expect(JSON.parse(fromSource(readInspectorTables)()).tables).toEqual({ layer: { rows: [] } });
    });

    it('reads Datatables from the tables adapter, keeping NaN and dropping functions', () => {
      const element = renderInspectorPanel();
      const meta: Record<string, unknown> = { type: 'number', field: 'bytes' };
      meta.self = meta;
      const table = {
        type: 'datatable',
        columns: [{ id: 'col-0', name: 'Bytes', meta }],
        rows: [{ 'col-0': 1 }, { 'col-0': Number.NaN }, { 'col-0': null }],
        format: () => 'dropped',
      };
      class FakeTablesAdapter {
        readonly #tables = { layer1: table };
        public get tables() {
          return this.#tables;
        }
      }
      attachFiber(element, {
        tables: new FakeTablesAdapter(),
        requests: {},
      });

      const reading = JSON.parse(fromSource(readInspectorTables)());

      expect(reading.status).toBe('ok');
      expect(reading.adapters).toEqual(['tables', 'requests']);
      expect(reading.tables.layer1.rows).toEqual([
        { 'col-0': 1 },
        { 'col-0': { $number: 'NaN' } },
        { 'col-0': null },
      ]);
      expect(reading.tables.layer1.columns[0].meta).toEqual({
        type: 'number',
        field: 'bytes',
        self: { $circular: true },
      });
      expect(reading.tables.layer1).not.toHaveProperty('format');
    });

    it('keeps an object that is referenced twice but is not a cycle', () => {
      const element = renderInspectorPanel();
      const shared = { type: 'string' };
      attachFiber(element, {
        tables: { tables: { a: { columns: [{ meta: shared }, { meta: shared }] } } },
      });

      const reading = JSON.parse(fromSource(readInspectorTables)());
      expect(reading.tables.a.columns).toEqual([{ meta: shared }, { meta: shared }]);
    });

    it('reports when the inspector is not open', () => {
      expect(JSON.parse(fromSource(readInspectorTables)())).toEqual({ status: 'no_inspector' });
    });

    it('reports when no adapters are reachable', () => {
      renderInspectorPanel();
      expect(JSON.parse(fromSource(readInspectorTables)())).toEqual({ status: 'no_adapters' });
    });
  });

  describe('listRenderedPanelIds', () => {
    it('lists dashboard panels in page order', () => {
      document.body.innerHTML = `
        <div data-test-subj="dashboardPanel" id="panel-b"></div>
        <div data-test-subj="dashboardPanel" id="panel-a"></div>
        <div data-test-subj="somethingElse" id="panel-c"></div>`;
      expect(JSON.parse(fromSource(listRenderedPanelIds)())).toEqual(['b', 'a']);
    });
  });

  describe('centerPanel', () => {
    it('scrolls the panel into view and reports its box and the viewport', () => {
      document.body.innerHTML = '<div id="panel-p1"></div>';
      const scrollIntoView = jest.fn();
      const panel = document.getElementById('panel-p1');
      if (!panel) {
        throw new Error('Panel did not render');
      }
      Object.assign(panel, { scrollIntoView });

      const placement = JSON.parse(fromSource(centerPanel)('p1'));

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'nearest' });
      expect(placement).toEqual({
        found: true,
        rect: { x: 0, y: 0, width: 0, height: 0 },
        viewport: { width: window.innerWidth, height: window.innerHeight },
      });
    });

    it('reports a panel that is not on the page', () => {
      expect(JSON.parse(fromSource(centerPanel)('missing')).found).toBe(false);
    });
  });

  describe('readRenderContext', () => {
    it('reads the theme tag, time zone and locale', () => {
      document.documentElement.lang = 'en';
      Object.assign(window, { __kbnThemeTag__: 'borealisdark' });
      const reading = JSON.parse(fromSource(readRenderContext)());
      expect(reading).toEqual(
        expect.objectContaining({
          themeTag: 'borealisdark',
          locale: 'en',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
      );
    });
  });

  describe('allChartsHaveDebugState', () => {
    it('is true only once every chart but metrics has rendered with DebugState', () => {
      document.body.innerHTML = `
        <div class="echChart">
          <div class="echChartStatus" data-ech-render-complete="true" data-ech-debug-state="{}"></div>
        </div>
        <div class="echChart">
          <div class="echChartStatus" data-ech-render-complete="true"></div>
        </div>
        <div class="echChart">
          <div class="echMetric"></div>
          <div class="echChartStatus" data-ech-render-complete="true"></div>
        </div>`;
      expect(fromSource(allChartsHaveDebugState)()).toBe(false);

      document.querySelectorAll('.echChartStatus')[1].setAttribute('data-ech-debug-state', '{}');
      expect(fromSource(allChartsHaveDebugState)()).toBe(true);
    });
  });
});

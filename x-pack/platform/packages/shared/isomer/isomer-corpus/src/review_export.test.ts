/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { exportReview } from './export_review';
import { toExpectedChart, toExpectedStrings, toHexColor, toVisibleText } from './review_export';
import type { PanelCapture } from './review_export';

const capture = (theme: string): PanelCapture => ({
  dashboard_id: 'dash',
  panel_id: 'p1',
  in_as_code: true,
  chart_type: 'metric',
  theme,
  context: {
    now: '2025-01-15T12:00:00.000Z',
    time_range: { absolute: { from: '2025-01-08T00:00:00.000Z', to: '2025-01-15T12:00:00.000Z' } },
    ui_settings: { 'dateFormat:tz': 'UTC' },
    page: { locale: 'en', devicePixelRatio: 2 },
    size: { width: 300, height: 160 },
  },
  panel: {
    found: true,
    rect: { width: 300, height: 160 },
    title: 'Bytes',
    renderComplete: true,
    errorText: null,
    charts: [
      {
        renderComplete: true,
        renderCount: 1,
        rect: { width: 1, height: 1 },
        debugState: null,
        svgTexts: [],
      },
    ],
    metrics: [
      {
        ariaLabel: null,
        inlineBackgroundColor: '',
        backgroundColor: 'rgb(17, 28, 44)',
        texts: [
          {
            text: '1.2 KB',
            tag: 'p',
            className: 'echMetricText__value',
            testSubj: null,
            ariaLabel: null,
            inlineColor: '',
            inlineBackgroundColor: '',
            color: 'rgb(227, 232, 242)',
            backgroundColor: 'rgba(0, 0, 0, 0)',
          },
        ],
      },
    ],
    dataGrids: [],
    legacyMetrics: [],
  },
});

describe('toHexColor', () => {
  it.each([
    ['rgb(255, 0, 16)', '#ff0010'],
    ['rgba(0, 0, 0, 0.5)', '#00000080'],
    ['rgb(0 128 255 / 100%)', '#0080ff'],
    ['#ABC', '#aabbcc'],
    ['#16C5C0', '#16c5c0'],
  ])('%s → %s', (input, output) => {
    expect(toHexColor(input)).toBe(output);
  });

  it('treats fully transparent and empty as no color', () => {
    expect(toHexColor('rgba(0, 0, 0, 0)')).toBeUndefined();
    expect(toHexColor('transparent')).toBeUndefined();
    expect(toHexColor('')).toBeUndefined();
  });
});

describe('toVisibleText', () => {
  it("removes EUI's hidden clipboard markers and screen reader hints", () => {
    expect(toVisibleText('100%↦')).toBe('100%');
    expect(toVisibleText('Cancel %↵')).toBe('Cancel %');
    expect(toVisibleText('𐘂𐘂Memphis↦✄𐘗Press Enter to interact✄𐘗')).toBe('Memphis');
  });
});

describe('toExpectedChart', () => {
  it('keeps the strings and colors of axes, legend, series and partitions', () => {
    expect(
      toExpectedChart({
        axes: {
          x: [
            {
              id: 'x',
              position: 'bottom',
              title: 'Day',
              labels: ['1st'],
              values: [1],
              gridlines: [],
            },
          ],
          y: [{ id: 'y', position: 'left', labels: ['0', '5'], values: [0, 5], gridlines: [] }],
        },
        legend: { items: [{ key: 'k', name: 'Count', color: '#16C5C0' }] },
        bars: [{ key: 'k', name: 'Count', color: '#16C5C0', bars: [{ x: 1, y: 2 }] }],
        partition: [
          {
            panelTitle: '',
            partitions: [{ name: 'a', depth: 1, color: 'rgb(1, 2, 3)', value: 3 }],
          },
        ],
        heatmap: { cells: [{ formatted: '12', value: 12, fill: '#000' }] },
        annotations: [{}, {}],
      })
    ).toEqual({
      axes: {
        x: [{ position: 'bottom', title: 'Day', labels: ['1st'] }],
        y: [{ position: 'left', labels: ['0', '5'] }],
      },
      legend: [{ name: 'Count', color: '#16c5c0' }],
      series: [{ kind: 'bar', name: 'Count', color: '#16c5c0' }],
      partitions: [{ name: 'a', depth: 1, color: '#010203' }],
      heatmap: [{ formatted: '12', color: '#000000' }],
      annotations: 2,
    });
  });
});

describe('toExpectedStrings', () => {
  it('reads metrics from the DOM and skips charts without DebugState', () => {
    const expected = toExpectedStrings(capture('dark'));
    expect(expected.charts).toEqual([]);
    expect(expected.metrics).toEqual([
      {
        background: '#111c2c',
        texts: [{ text: '1.2 KB', part: 'echMetricText__value', color: '#e3e8f2' }],
      },
    ]);
    expect(expected.context).toEqual(
      expect.objectContaining({ time_zone: 'UTC', locale: 'en', size: { width: 300, height: 160 } })
    );
  });

  it('orders table cells by row and column', () => {
    const base = capture('light');
    const cell = (row: number, column: number, text: string) => ({
      ...base.panel.metrics[0].texts[0],
      text,
      row,
      column,
    });
    const expected = toExpectedStrings({
      ...base,
      panel: {
        ...base.panel,
        metrics: [],
        dataGrids: [
          {
            headers: [{ ...base.panel.metrics[0].texts[0], text: 'Name' }],
            cells: [cell(1, 0, 'b'), cell(0, 1, '2'), cell(0, 0, 'a')],
            rowCount: 2,
            columnCount: 2,
          },
        ],
      },
    });
    expect(expected.tables[0].headers).toEqual(['Name']);
    expect(expected.tables[0].rows.map((row) => row.map(({ text }) => text))).toEqual([
      ['a', '2'],
      ['b'],
    ]);
  });
});

describe('exportReview', () => {
  let root: string;

  beforeEach(() => {
    root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'isomer-review-'));
  });

  afterEach(() => {
    Fs.rmSync(root, { recursive: true, force: true });
  });

  const write = (path: string, contents: string) => {
    Fs.mkdirSync(Path.dirname(Path.join(root, path)), { recursive: true });
    Fs.writeFileSync(Path.join(root, path), contents);
  };

  it('writes expected strings, copies screenshots and indexes every case', () => {
    write('captures/run.json', JSON.stringify({ now: 'x' }));
    write('captures/dash/panels/p1/light/capture.json', JSON.stringify(capture('light')));
    write('captures/dash/panels/p1/light/screenshot.png', 'png');
    write('captures/dash/panels/p1/dark/capture.json', JSON.stringify(capture('dark')));
    write('captures/round_trip/report.md', '# not a dashboard');
    write('review/stale.json', '{}');

    const index = exportReview({
      capturesDir: Path.join(root, 'captures'),
      outDir: Path.join(root, 'review'),
    });

    expect(index.cases).toEqual([
      {
        id: 'dash/p1',
        dashboard: 'dash',
        dashboard_id: 'dash',
        panel_id: 'p1',
        title: 'Bytes',
        chart_type: 'metric',
        in_as_code: true,
        themes: {
          light: { expected: 'dash/p1/light.expected.json', screenshot: 'dash/p1/light.png' },
          dark: { expected: 'dash/p1/dark.expected.json', screenshot: null },
        },
      },
    ]);
    expect(index.missing_screenshots).toEqual(['dash/p1/dark']);
    expect(Fs.readFileSync(Path.join(root, 'review/dash/p1/light.png'), 'utf8')).toBe('png');
    expect(Fs.existsSync(Path.join(root, 'review/stale.json'))).toBe(false);
    expect(JSON.parse(Fs.readFileSync(Path.join(root, 'review/index.json'), 'utf8')).run).toEqual({
      now: 'x',
    });
  });

  it('refuses to export without a capture run', () => {
    expect(() =>
      exportReview({ capturesDir: Path.join(root, 'none'), outDir: Path.join(root, 'review') })
    ).toThrow('No capture run');
  });
});

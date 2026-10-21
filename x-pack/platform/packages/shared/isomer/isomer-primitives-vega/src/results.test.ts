/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';

import { kibanaSpecs } from './corpus/kibana.fixtures';
import { vegaSpecs } from './corpus/vega.fixtures';
import { vegaLiteSpecs } from './corpus/vega_lite.fixtures';
import { createVegaPack } from './pack';
import { pruneVegaResults, renderVegaSvg, toVegaSpec, type VegaChartInput } from './render';
import type { VegaResult } from './results';
import { isSpecObject, type SpecObject } from './spec';
import { vegaDarkTheme, vegaLightTheme } from './theme';

const SIZE = { width: 480, height: 300 };
const THEMES = [vegaLightTheme, vegaDarkTheme];

const svgOf = (input: VegaChartInput) =>
  renderVegaSvg(toVegaSpec(input, vegaLightTheme), input).svg.replace(
    /isomer-vega-[a-z0-9]+-/g,
    ''
  );

const count = (value: unknown): number =>
  value !== null && typeof value === 'object'
    ? 1 + Object.values(value).reduce<number>((sum, child) => sum + count(child), 0)
    : 1;

/** `spec` with each inline `data` entry's values moved to a result, its `url` a Kibana query as authored. */
const asResults = (mode: VegaChartInput['mode'], spec: SpecObject): VegaChartInput => {
  const results: VegaResult[] = [];
  const data = Array.isArray(spec.data) ? spec.data : isSpecObject(spec.data) ? [spec.data] : [];
  const moved = data.map((entry, index) => {
    if (!isSpecObject(entry) || entry.values === undefined) return entry;
    const { values, ...rest } = entry;
    results.push({
      path: Array.isArray(spec.data) ? ['data', index] : ['data'],
      values,
      scope: 'static',
    });
    return { ...rest, url: { index: 'logs', body: { size: 0 } } };
  });
  return {
    mode,
    spec: { ...spec, data: Array.isArray(spec.data) ? moved : moved[0] },
    results,
    ...SIZE,
  };
};

describe('vega results', () => {
  const runtime = createIsomerRuntime({ packs: [createVegaPack()] });
  const errors = (node: object) =>
    runtime
      .validate({ type: 'view', body: [node as PrimitiveNode] })
      .errors.map(({ path, message }) => `${path}: ${message}`);
  const bars = {
    data: [{ name: 'table', url: { index: 'logs', body: {} }, format: { property: 'rows' } }],
    scales: [{ name: 'y', type: 'linear', domain: { data: 'table', field: 'v' }, range: 'height' }],
    marks: [
      {
        type: 'rect',
        from: { data: 'table' },
        encode: { update: { x: { value: 0 }, width: { value: 4 }, y: { scale: 'y', field: 'v' } } },
      },
    ],
  };
  const node = (extra: object) => ({
    type: 'vega',
    mode: 'vega',
    spec: bars,
    caption: 'Bars.',
    ...SIZE,
    ...extra,
  });

  it('accepts a source’s url only where a result replaces it', () => {
    const results = [{ path: ['data', 0], values: { rows: [{ v: 1 }] }, scope: 'static' }];
    expect(errors(node({ results }))).toEqual([]);
    expect(errors(node({}))).toEqual([
      expect.stringMatching(/spec\.data\[0\]\.url: .*cannot load anything by URL/),
    ]);
    // A result at the wrong path replaces nothing, so the url stands too.
    expect(errors(node({ results: [{ ...results[0], path: ['data', 3] }] }))).toEqual([
      expect.stringMatching(/spec\.data\[0\]\.url: /),
      expect.stringMatching(/results\[0\]\.path: names no data entry/),
    ]);
  });

  it('draws a result as the inline values it replaces', () => {
    const values = { rows: [{ v: 1 }, { v: 3 }] };
    const inline = {
      mode: 'vega' as const,
      spec: { ...bars, data: [{ ...bars.data[0], url: undefined, values }] },
      ...SIZE,
    };
    expect(
      svgOf({
        mode: 'vega',
        spec: bars,
        results: [{ path: ['data', 0], values, scope: 'static' }],
        ...SIZE,
      })
    ).toBe(svgOf(inline));
  });

  it('keeps only what the drawing reads: not hover-only rows, not tooltips', () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({
      v: index,
      label: `row ${index}`,
      // Read only by the tooltip and by the hover-driven group, never by the static drawing.
      children: Array.from({ length: 50 }, (_unused, child) => ({
        v: child,
        note: 'x'.repeat(20),
      })),
    }));
    const input: VegaChartInput = {
      mode: 'vega',
      spec: {
        ...bars,
        signals: [
          { name: 'hovered', value: null, on: [{ events: 'rect:mouseover', update: 'datum' }] },
        ],
        data: [...bars.data, { name: 'picked', on: [{ trigger: 'hovered', insert: 'hovered' }] }],
        marks: [
          {
            ...bars.marks[0],
            encode: {
              update: {
                ...bars.marks[0].encode.update,
                tooltip: { signal: "datum.label + ': ' + length(datum.children)" },
              },
            },
          },
          {
            type: 'group',
            from: { facet: { name: 'kids', data: 'picked', field: 'children' } },
            marks: [
              {
                type: 'text',
                from: { data: 'kids' },
                encode: { update: { text: { field: 'note' } } },
              },
            ],
          },
          // `length` alone keeps the array's length.
          { type: 'text', encode: { update: { text: { signal: "length(data('table'))" } } } },
        ],
      },
      results: [{ path: ['data', 0], values: { rows, extra: { unused: true } }, scope: 'static' }],
      ...SIZE,
    };
    const pruned = pruneVegaResults(input, THEMES);
    expect(pruned).not.toBe(input);
    const values = pruned.results![0]!.values as { rows: object[]; extra?: unknown };
    expect(values.extra).toBeUndefined();
    expect(values.rows).toHaveLength(20);
    expect(values.rows[0]).toEqual({ v: 0 });
    expect(count(pruned.results)).toBeLessThan(count(input.results) / 20);
    expect(svgOf(pruned)).toBe(svgOf(input));
  });

  it('keeps what computed keys, data() in a signal, and lookup read', () => {
    const input: VegaChartInput = {
      mode: 'vega',
      spec: {
        signals: [
          { name: 'field', value: 'v' },
          { name: 'total', update: "length(data('table')) + data('table')[0].w" },
        ],
        data: [
          { name: 'names', url: { index: 'n', body: {} } },
          {
            name: 'table',
            url: { index: 't', body: {} },
            transform: [
              { type: 'lookup', from: 'names', key: 'id', fields: ['id'], values: ['name'] },
            ],
          },
        ],
        marks: [
          {
            type: 'text',
            from: { data: 'table' },
            encode: {
              update: {
                text: { signal: "datum.name + ' ' + datum[field] + ' ' + total" },
                y: { signal: 'datum.v * 10' },
              },
            },
          },
        ],
      },
      results: [
        { path: ['data', 0], values: [{ id: 1, name: 'one', unused: 1 }], scope: 'static' },
        { path: ['data', 1], values: [{ id: 1, v: 2, w: 3, unused: 4 }], scope: 'static' },
      ],
      ...SIZE,
    };
    const pruned = pruneVegaResults(input, THEMES);
    expect(pruned.results!.map(({ values }) => values)).toEqual([
      [{ id: 1, name: 'one' }],
      [{ id: 1, v: 2, w: 3 }],
    ]);
    expect(svgOf(pruned)).toBe(svgOf(input));
  });

  describe.each([
    ['Vega-Lite', vegaLiteSpecs],
    ['Vega', vegaSpecs],
    ['Kibana', kibanaSpecs],
  ])('over the %s corpus', (_source, specs) => {
    const cases = specs.filter(
      ({ fails, random, spec }) =>
        fails === undefined && !random && asResults('vega', spec).results!.length > 0
    );
    it.each(cases.map((entry) => [entry.name, entry] as const))(
      '%s draws the same from pruned results',
      (_name, { mode, spec }) => {
        const input = asResults(mode, spec);
        const pruned = pruneVegaResults(input, THEMES);
        // Pruning that couldn't prove itself returns the input; every corpus chart should prove itself.
        expect(pruned).not.toBe(input);
        expect(svgOf(pruned)).toBe(svgOf(input));
      }
    );
  });
});

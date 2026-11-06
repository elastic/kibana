/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggConfigs, tabifyAggResponse } from '@kbn/data-plugin/common';
import { mockAggTypesRegistry } from '@kbn/data-plugin/common/search/aggs/test_helpers';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { GenericIndexPatternColumn, PersistedIndexPatternLayer } from '@kbn/lens-common';
import { createTestKitServices } from '../kit/kit_services.mock';
import type { CompiledLensLayer } from './compile_layer';
import { compileLensLayer } from './compile_layer';

const metric = (
  operationType: string,
  sourceField: string,
  params?: Record<string, unknown>
): GenericIndexPatternColumn =>
  ({
    operationType,
    sourceField,
    dataType: 'number',
    isBucketed: false,
    label: '',
    ...(params ? { params } : {}),
  } as GenericIndexPatternColumn);

const count = metric('count', '___records___');

const layerOf = (
  columns: Record<string, GenericIndexPatternColumn>,
  extra: Partial<PersistedIndexPatternLayer> = {}
): PersistedIndexPatternLayer => ({ columns, columnOrder: Object.keys(columns), ...extra });

const compile = (layer: PersistedIndexPatternLayer) =>
  compileLensLayer(layer, 'logs') as CompiledLensLayer;

const idsOf = (idMap: CompiledLensLayer['idMap']) =>
  Object.fromEntries(Object.entries(idMap).map(([id, columns]) => [id, columns.map((c) => c.id)]));

describe('compileLensLayer', () => {
  it('runs one agg per column in column order, with the options Lens runs esaggs with', () => {
    const { request, idMap } = compile(
      layerOf({ a: count, b: metric('average', 'bytes'), c: metric('unique_count', 'host') })
    );

    expect(request).toEqual({
      kind: 'aggs',
      dataView: 'logs',
      aggs: [
        expect.objectContaining({ id: '0', type: 'count' }),
        expect.objectContaining({ id: '1', type: 'avg' }),
        expect.objectContaining({ id: '2', type: 'cardinality' }),
      ],
      metricsAtAllLevels: false,
      partialRows: false,
    });
    expect(idMap).toEqual({
      'col-0-0': [{ ...count, id: 'a' }],
      'col-1-1': [{ ...metric('average', 'bytes'), id: 'b' }],
      'col-2-2': [{ ...metric('unique_count', 'host'), id: 'c' }],
    });
  });

  // Lens's form_based.test.ts, "should deduplicate aggs for supported operations".
  it('runs duplicate aggs once, filling every column they fill', () => {
    const { request, idMap } = compile(layerOf({ col2: count, col3: count, col4: count }));

    expect(request.aggs).toHaveLength(1);
    expect(idsOf(idMap)).toEqual({ 'col-0-0': ['col2', 'col3', 'col4'] });
  });

  // Lens's percentile.test.tsx, "should collapse percentile dimensions with matching parameters".
  it('merges percentiles of one field into one percentiles agg, after the others', () => {
    const { request, idMap } = compile(
      layerOf({
        p1: metric('percentile', 'foo', { percentile: 10 }),
        p2: metric('percentile', 'foo', { percentile: 20 }),
        p3: metric('percentile', 'foo', { percentile: 30 }),
        p4: metric('percentile', 'bar', { percentile: 10 }),
        avg: metric('average', 'bar'),
        p5: metric('percentile', 'bar', { percentile: 40 }),
      })
    );

    expect(request.aggs).toEqual([
      expect.objectContaining({ id: '4', type: 'avg' }),
      {
        id: '0',
        enabled: true,
        schema: 'metric',
        type: 'percentiles',
        params: { field: 'foo', percents: [10, 20, 30] },
      },
      {
        id: '3',
        enabled: true,
        schema: 'metric',
        type: 'percentiles',
        params: { field: 'bar', percents: [10, 40] },
      },
    ]);
    expect(idsOf(idMap)).toEqual({
      'col-0-4': ['avg'],
      'col-1-0.10': ['p1'],
      'col-2-0.20': ['p2'],
      'col-3-0.30': ['p3'],
      'col-4-3.10': ['p4'],
      'col-5-3.40': ['p5'],
    });
  });

  it('keeps a single percentile as a single percentile agg', () => {
    const { request, idMap } = compile(
      layerOf({ p: metric('percentile', 'foo', { percentile: 95 }) })
    );

    expect(request.aggs).toEqual([expect.objectContaining({ type: 'single_percentile' })]);
    expect(idsOf(idMap)).toEqual({ 'col-0-0': ['p'] });
  });

  it("samples with the layer's probability, unless a min or max column is in it", () => {
    expect(compile(layerOf({ a: count }, { sampling: 0.1 })).request.probability).toBe(0.1);
    expect(
      compile(layerOf({ a: count, b: metric('max', 'bytes') }, { sampling: 0.1 })).request
    ).not.toHaveProperty('probability');
  });

  it("ignores the global filters and query when the layer does, as Lens's esaggs does", () => {
    expect(compile(layerOf({ a: count }, { ignoreGlobalFilters: true })).request.context).toEqual({
      ignoreGlobalFilters: true,
    });
  });

  it('compiles nothing for a layer without columns', () => {
    expect(compileLensLayer({ columns: {}, columnOrder: [] }, 'logs')).toBeUndefined();
  });

  it.each([
    ['a bucket operation', { ...count, operationType: 'terms', isBucketed: true }, '"terms"'],
    ['a reference operation', { ...count, operationType: 'cumulative_sum' }, '"cumulative_sum"'],
    ['a filter', { ...count, filter: { language: 'kuery', query: 'a: 1' } }, 'with a filter'],
    ['a time shift', { ...count, timeShift: '1d' }, 'with a time shift'],
    ['a reduced time range', { ...count, reducedTimeRange: '1h' }, 'reduced time range'],
    ['a time scale', { ...count, timeScale: 's' }, 'time scale'],
  ] as Array<[string, GenericIndexPatternColumn, string]>)(
    'throws for a column with %s, which it cannot compile yet',
    (_name, column, message) => {
      expect(() => compile(layerOf({ a: column }))).toThrow(message);
    }
  );

  describe("against Kibana's own agg configs and tabify", () => {
    let dataView: ReturnType<typeof createStubDataView>;
    beforeAll(async () => {
      const { registry } = await createTestKitServices();
      dataView = createStubDataView({
        deps: { fieldFormats: registry },
        spec: {
          id: 'logs',
          title: 'logs-*',
          fields: {
            bytes: {
              name: 'bytes',
              type: 'number',
              esTypes: ['long'],
              aggregatable: true,
              searchable: true,
            },
          },
        },
      });
    });

    it("names each Lens column by the table column tabify writes for it, as Lens's idMap does", () => {
      const { request, idMap } = compile(
        layerOf({
          p95: metric('percentile', 'bytes', { percentile: 95 }),
          total: metric('sum', 'bytes', { emptyAsNull: true }),
          p99: metric('percentile', 'bytes', { percentile: 99 }),
          records: count,
        })
      );
      const aggConfigs = new AggConfigs(
        dataView,
        request.aggs,
        { typesRegistry: mockAggTypesRegistry() },
        jest.fn()
      );

      expect(aggConfigs.toDsl()).toEqual({
        '1': { sum: { field: 'bytes' } },
        // Kibana's percentiles agg asks for unkeyed values, read back as in its percentiles tests.
        '0': { percentiles: { field: 'bytes', percents: [95, 99], keyed: false } },
      });

      const table = tabifyAggResponse(aggConfigs, {
        hits: { total: 10 },
        aggregations: {
          '1': { value: 2048 },
          '0': {
            values: [
              { key: 95, value: 300 },
              { key: 99, value: 400 },
            ],
          },
        },
      });

      expect(table.columns.map(({ id }) => id)).toEqual(Object.keys(idMap));
      expect(idsOf(idMap)).toEqual({
        'col-0-1': ['total'],
        'col-1-3': ['records'],
        'col-2-0.95': ['p95'],
        'col-3-0.99': ['p99'],
      });
      expect(table.rows).toEqual([
        { 'col-0-1': 2048, 'col-1-3': 10, 'col-2-0.95': 300, 'col-3-0.99': 400 },
      ]);
    });
  });
});

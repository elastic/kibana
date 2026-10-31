/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lowerLens, readLensResponse } from '..';
import type { LensEnvelope } from './schema';

const makeLens = (): LensEnvelope => ({
  id: 'lens-orders',
  type: 'lens',
  attributes: {
    title: 'Orders',
    visualizationType: 'lnsMetric',
    state: {
      datasourceStates: {
        textBased: {
          layers: {
            totals: {
              query: { esql: 'FROM orders-* | STATS orders = COUNT(*)' },
              columns: [
                {
                  columnId: 'metric-id',
                  fieldName: 'orders',
                  label: 'Order count',
                  customLabel: true,
                },
              ],
            },
          },
        },
      },
      visualization: { layerId: 'totals', metricAccessor: 'metric-id' },
      query: { query: '', language: 'kuery' },
      filters: [],
    },
  },
  references: [{ type: 'index-pattern', id: 'orders-view', name: 'orders-*' }],
});

const withLayers = (layers: object) => {
  const lens = makeLens();
  return {
    savedObject: {
      ...lens,
      attributes: {
        ...lens.attributes,
        state: { ...lens.attributes.state, datasourceStates: { textBased: { layers } } },
      },
    },
  };
};

describe('lowerLens', () => {
  it('plans native ES|QL independently of chart primitives and projects its response', () => {
    const savedObject = makeLens();
    const result = lowerLens({
      savedObject,
      dataViews: [
        {
          id: 'orders-view',
          title: 'orders-*',
          timeFieldName: 'created_at',
          fieldLabels: { orders: 'Order count' },
          fieldFormats: { orders: { id: 'number', params: { pattern: '0,0' } } },
        },
      ],
    });
    expect(result.status).toBe('planned');
    if (result.status !== 'planned') {
      throw new Error('Expected planned Lens');
    }
    expect(result.plan.source).toEqual(savedObject);
    expect(result.plan.queries).toEqual([
      {
        layerId: 'totals',
        query: { language: 'esql', esql: 'FROM orders-* | STATS orders = COUNT(*)' },
        context: { ignoreGlobalFilters: false },
        columns: [
          { columnId: 'metric-id', fieldName: 'orders', label: 'Order count', customLabel: true },
        ],
      },
    ]);
    expect(result.plan.dataViews[0].metadata?.timeFieldName).toBe('created_at');
    expect(JSON.parse(JSON.stringify(result.plan))).toEqual(result.plan);
    expect(
      readLensResponse(result.plan.queries[0], {
        columns: [{ name: 'orders', type: 'long' }],
        values: [[42]],
      })
    ).toEqual({
      status: 'ready',
      table: {
        layerId: 'totals',
        columns: [{ lens: result.plan.queries[0].columns[0], responseType: 'long' }],
        rows: [[42]],
      },
    });
  });

  it('preserves all layers and exact ES|QL bytes, without inferring time fields from references', () => {
    const result = lowerLens(
      withLayers({
        totals: {
          query: { esql: '  FROM orders-* | STATS orders = COUNT(*)\n' },
          columns: [{ columnId: 'count', fieldName: 'orders' }],
          ignoreGlobalFilters: true,
        },
        trend: {
          query: { esql: 'FROM orders-* | STATS orders = COUNT(*) BY created_at' },
          columns: [{ columnId: 'date', fieldName: 'created_at' }],
          timeField: 'created_at',
        },
      })
    );
    if (result.status !== 'planned') {
      throw new Error(JSON.stringify(result));
    }
    expect(result.plan.queries.map(({ layerId }) => layerId)).toEqual(['totals', 'trend']);
    expect(result.plan.queries[0].query.esql).toBe('  FROM orders-* | STATS orders = COUNT(*)\n');
    expect(result.plan.queries[0].context).toEqual({ ignoreGlobalFilters: true });
    expect(result.plan.queries[1].context.timeFieldName).toBe('created_at');
    expect(result.plan.dataViews).toEqual([{ reference: makeLens().references[0] }]);
  });

  it('does not require data-view references for source-free ES|QL', () => {
    const input = withLayers({
      static: {
        query: { esql: 'ROW value = 1' },
        columns: [{ columnId: 'value', fieldName: 'value' }],
      },
    });
    input.savedObject.references = [];
    expect(lowerLens(input).status).toBe('planned');
  });

  it('detaches the plan from subsequent caller mutations', () => {
    const savedObject = makeLens();
    const result = lowerLens({ savedObject });
    savedObject.attributes.state.visualization.metricAccessor = 'changed';
    if (result.status !== 'planned') {
      throw new Error('Expected planned Lens');
    }
    expect(result.plan.source.attributes.state.visualization.metricAccessor).toBe('metric-id');
  });

  it.each([
    null,
    [],
    {},
    { savedObject: { ...makeLens(), type: 'dashboard' } },
    { savedObject: { ...makeLens(), references: null } },
    { savedObject: makeLens(), dataViews: [{ id: 'orders-view' }] },
    withLayers({}),
    withLayers({ totals: { query: { esql: ' ' }, columns: [] } }),
    withLayers({
      totals: { query: { sql: 'SELECT 1' }, columns: [{ columnId: 'a', fieldName: 'a' }] },
    }),
    withLayers({ totals: { query: { esql: 'ROW a=1' }, columns: [{ columnId: 'a' }] } }),
  ])('rejects malformed input %# with path diagnostics', (input) => {
    const result = lowerLens(input);
    expect(result.status).toBe('invalid');
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it.each([
    { formBased: { layers: { totals: { columns: { count: { operationType: 'count' } } } } } },
    { textBased: { layers: {} }, formBased: { layers: {} } },
    { indexpattern: { layers: {} } },
  ])('honestly refuses unsupported datasource state %#', (datasourceStates) => {
    const lens = makeLens();
    expect(
      lowerLens({
        savedObject: {
          ...lens,
          attributes: { ...lens.attributes, state: { ...lens.attributes.state, datasourceStates } },
        },
      })
    ).toMatchObject({
      status: 'unsupported',
      diagnostics: [{ code: 'lens.unsupported-datasource' }],
    });
  });

  it.each([
    { table: { columns: [], rows: [] } },
    { errors: ['Failed query'] },
    { futureFeature: true },
  ])('refuses unimplemented ES|QL layer semantics %#', (extension) => {
    expect(
      lowerLens(
        withLayers({
          totals: {
            query: { esql: 'ROW orders=1' },
            columns: [{ columnId: 'a', fieldName: 'orders' }],
            ...extension,
          },
        })
      ).status
    ).toBe('unsupported');
  });

  it('refuses partial-bucket transforms rather than dropping them', () => {
    expect(
      lowerLens(
        withLayers({
          totals: {
            query: { esql: 'ROW orders=1' },
            columns: [{ columnId: 'a', fieldName: 'orders', params: { dropPartials: true } }],
          },
        })
      ).status
    ).toBe('unsupported');
  });

  it('classifies a valid inline-table-only layer as unsupported, not malformed', () => {
    expect(
      lowerLens(
        withLayers({
          totals: {
            table: { columns: [{ id: 'orders', name: 'orders' }], rows: [{ orders: 1 }] },
            columns: [{ columnId: 'a', fieldName: 'orders' }],
          },
        })
      ).status
    ).toBe('unsupported');
  });

  it.each([
    { filters: [{ meta: { disabled: true }, query: { match_all: {} } }] },
    { query: { query: 'status:200', language: 'kuery' } },
    { query: { query: { match_all: {} }, language: 'lucene' } },
  ])('does not silently ignore saved execution context %#', (context) => {
    const lens = makeLens();
    Object.assign(lens.attributes.state, context);
    expect(lowerLens({ savedObject: lens }).status).toBe('unsupported');
  });

  it('rejects duplicate column IDs rather than merging them', () => {
    expect(
      lowerLens(
        withLayers({
          totals: {
            query: { esql: 'ROW a=1, b=2' },
            columns: [
              { columnId: 'a', fieldName: 'a' },
              { columnId: 'a', fieldName: 'b' },
            ],
          },
        })
      ).status
    ).toBe('invalid');
  });

  it('rejects ambiguous references and metadata', () => {
    const lens = makeLens();
    lens.references.push({ ...lens.references[0], id: 'other' });
    expect(lowerLens({ savedObject: lens }).diagnostics[0].code).toBe('lens.duplicate-reference');
    const metadata = { id: 'orders-view', title: 'orders-*' };
    expect(
      lowerLens({ savedObject: makeLens(), dataViews: [metadata, metadata] }).diagnostics[0].code
    ).toBe('lens.duplicate-data-view');
    expect(
      lowerLens({
        savedObject: makeLens(),
        dataViews: [{ id: 'unrelated', title: 'other-*' }],
      }).diagnostics[0].code
    ).toBe('lens.unreferenced-data-view');
  });

  it.each([
    undefined,
    NaN,
    Infinity,
    new Date(),
    () => 'not JSON',
    'x'.repeat(100_001),
    Array.from({ length: 10_001 }, () => null),
    JSON.parse('{"__proto__":{}}'),
  ])('bounds and validates opaque JSON state %#', (extension) => {
    const lens = makeLens();
    expect(lowerLens({ savedObject: lens, extension })).toMatchObject({
      status: 'invalid',
      diagnostics: [{ code: 'lens.invalid-json' }],
    });
  });

  it('rejects cycles, excessive nesting and total node/character budgets without recursion errors', () => {
    const cycle: { self?: object } = {};
    cycle.self = cycle;
    const deep = Array.from({ length: 21 }).reduce<object>((value) => ({ child: value }), {});
    const tooManyNodes = Array.from({ length: 11 }, () =>
      Array.from({ length: 10_000 }, () => null)
    );
    const tooManyCharacters = Array.from({ length: 21 }, () => 'x'.repeat(100_000));
    for (const extension of [cycle, deep, tooManyNodes, tooManyCharacters]) {
      expect(lowerLens({ savedObject: makeLens(), extension }).diagnostics[0].code).toBe(
        'lens.invalid-json'
      );
    }
  });

  it('accepts exactly 16 layers and 512 columns, and rejects either cap plus one', () => {
    const makeLayers = (layerCount: number, columnCount: number) =>
      Object.fromEntries(
        Array.from({ length: layerCount }, (_, index) => [
          `layer-${index}`,
          {
            query: { esql: 'ROW value=1' },
            columns: Array.from({ length: columnCount }, (__, column) => ({
              columnId: `column-${column}`,
              fieldName: 'value',
            })),
          },
        ])
      );
    expect(lowerLens(withLayers(makeLayers(16, 512))).status).toBe('planned');
    expect(lowerLens(withLayers(makeLayers(17, 1))).status).toBe('invalid');
    expect(lowerLens(withLayers(makeLayers(1, 513))).status).toBe('invalid');
  });

  it('snapshots opaque datasource state and nested formatting metadata', () => {
    const format = { id: 'number', params: { pattern: '0,0' } };
    const input = withLayers({
      totals: {
        query: { esql: 'ROW value=1' },
        columns: [{ columnId: 'a', fieldName: 'value', params: { format } }],
      },
    });
    const result = lowerLens(input);
    format.params.pattern = 'changed';
    if (result.status !== 'planned') {
      throw new Error('Expected planned Lens');
    }
    expect(JSON.stringify(result.plan)).not.toContain('changed');
  });

  it('rejects accessors, symbol keys and sparse arrays without executing getters', () => {
    const getter = jest.fn(() => 1);
    const accessor = Object.defineProperty({}, 'value', { enumerable: true, get: getter });
    const nonenumerableToJson = Object.defineProperty({}, 'toJSON', { value: getter });
    for (const extension of [accessor, nonenumerableToJson, { [Symbol('key')]: 1 }, new Array(1)]) {
      expect(lowerLens({ savedObject: makeLens(), extension }).diagnostics[0].code).toBe(
        'lens.invalid-json'
      );
    }
    expect(getter).not.toHaveBeenCalled();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  diffJson,
  diffLensAttributes,
  getLensIdAliases,
  replaceIds,
  toFieldPattern,
} from './round_trip';

const LAYER_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const LAYER_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const COLUMN_A1 = 'cccccccc-3333-4333-8333-cccccccccccc';
const COLUMN_A2 = 'dddddddd-4444-4444-8444-dddddddddddd';
const COLUMN_B1 = 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee';
const COLUMN_B2 = 'ffffffff-6666-4666-8666-ffffffffffff';

const xyAttributes = (layerId: string, xId: string, yId: string, extra: object = {}) => ({
  visualizationType: 'lnsXY',
  references: [
    { type: 'index-pattern', id: 'logs', name: `indexpattern-datasource-layer-${layerId}` },
  ],
  state: {
    visualization: { layers: [{ layerId, xAccessor: xId, accessors: [yId] }] },
    datasourceStates: {
      formBased: {
        layers: {
          [layerId]: {
            columnOrder: [xId, yId],
            columns: {
              [xId]: { operationType: 'date_histogram', sourceField: 'timestamp' },
              [yId]: { operationType: 'count', sourceField: '___records___', ...extra },
            },
          },
        },
      },
    },
  },
});

describe('getLensIdAliases', () => {
  it('names layers by visualization order and columns by operation and field', () => {
    const aliases = getLensIdAliases(xyAttributes(LAYER_A, COLUMN_A1, COLUMN_A2));
    expect(Object.fromEntries(aliases)).toEqual({
      [LAYER_A]: '<layer_0>',
      [COLUMN_A1]: '<layer_0:date_histogram(timestamp)>',
      [COLUMN_A2]: '<layer_0:count(___records___)>',
    });
  });

  it('names ad hoc data views', () => {
    const id = 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a';
    const aliases = getLensIdAliases({
      state: { adHocDataViews: { [id]: { name: 'kibana_sample_data_logs' } } },
    });
    expect(aliases.get(id)).toBe('<data_view:kibana_sample_data_logs>');
  });

  it('numbers repeated columns and names ES|QL columns by field', () => {
    const aliases = getLensIdAliases({
      state: {
        visualization: { layerId: 'l' },
        datasourceStates: {
          textBased: {
            layers: {
              l: {
                columns: [
                  { columnId: 'a', fieldName: 'count' },
                  { columnId: 'b', fieldName: 'count' },
                ],
              },
            },
          },
        },
      },
    });
    expect(aliases.get('a')).toBe('<layer_0:esql(count)>');
    expect(aliases.get('b')).toBe('<layer_0:esql(count)#1>');
  });
});

describe('replaceIds', () => {
  it('replaces IDs in keys, values and inside reference names', () => {
    const aliases = new Map([[LAYER_A, '<layer_0>']]);
    expect(
      replaceIds({ [LAYER_A]: { name: `indexpattern-datasource-layer-${LAYER_A}` } }, aliases)
    ).toEqual({ '<layer_0>': { name: 'indexpattern-datasource-layer-<layer_0>' } });
  });

  it('replaces short layer IDs as whole tokens inside strings', () => {
    const aliases = new Map([['area_0', '<layer_0>']]);
    expect(
      replaceIds(['indexpattern-datasource-layer-area_0', 'area_01', 'myarea_0'], aliases)
    ).toEqual(['indexpattern-datasource-layer-<layer_0>', 'area_01', 'myarea_0']);
  });

  it('keeps field names, even when an ID equals one', () => {
    const aliases = new Map([['bytes', '<layer_0:esql(bytes)>']]);
    expect(replaceIds({ columnId: 'bytes', fieldName: 'bytes' }, aliases)).toEqual({
      columnId: '<layer_0:esql(bytes)>',
      fieldName: 'bytes',
    });
  });

  it('leaves IDs with spaces alone inside strings', () => {
    const aliases = new Map([
      ['Unique Visits (Last hour)', '<layer_0:esql(Unique Visits (Last hour))>'],
    ]);
    expect(replaceIds('| SORT `Unique Visits (Last hour)` DESC', aliases)).toBe(
      '| SORT `Unique Visits (Last hour)` DESC'
    );
  });

  it('only replaces short IDs when they are the whole string', () => {
    const aliases = new Map([['count', '<layer_0:esql(count)>']]);
    expect(replaceIds(['count', 'count of records'], aliases)).toEqual([
      '<layer_0:esql(count)>',
      'count of records',
    ]);
  });
});

describe('diffJson', () => {
  it('reports removed, added and changed leaves', () => {
    expect(diffJson({ a: 1, b: { c: 2 }, d: [1, 2] }, { b: { c: 3 }, d: [1], e: true })).toEqual([
      { path: 'a', kind: 'removed', before: 1 },
      { path: 'b.c', kind: 'changed', before: 2, after: 3 },
      { path: 'd[1]', kind: 'removed', before: 2 },
      { path: 'e', kind: 'added', after: true },
    ]);
  });

  it('matches objects in arrays by their identity, not position', () => {
    expect(
      diffJson(
        {
          columns: [
            { columnId: 'a', label: 'A' },
            { columnId: 'b', label: 'B' },
          ],
        },
        {
          columns: [
            { columnId: 'b', label: 'B' },
            { columnId: 'a', label: 'X' },
          ],
        }
      )
    ).toEqual([{ path: 'columns[a].label', kind: 'changed', before: 'A', after: 'X' }]);
  });

  it('compares string arrays as sets and treats missing and empty as equal', () => {
    expect(diffJson({ a: ['x', 'y'], b: [], c: null }, { a: ['y', 'x'], d: {} })).toEqual([]);
  });
});

describe('diffLensAttributes', () => {
  it('ignores regenerated IDs and reports what changed', () => {
    const before = xyAttributes(LAYER_A, COLUMN_A1, COLUMN_A2, { params: { format: 'bytes' } });
    const after = xyAttributes(LAYER_B, COLUMN_B1, COLUMN_B2);
    expect(diffLensAttributes(before, after)).toEqual([
      {
        path: 'state.datasourceStates.formBased.layers.<layer_0>.columns.<layer_0:count(___records___)>.params.format',
        kind: 'removed',
        before: 'bytes',
      },
    ]);
  });
});

describe('toFieldPattern', () => {
  it('generalizes indexes, layers and columns', () => {
    expect(
      toFieldPattern(
        'state.datasourceStates.formBased.layers.<layer_1>.columns.<layer_1:count()#2>.label'
      )
    ).toBe('state.datasourceStates.formBased.layers.<layer>.columns.<column>.label');
    expect(toFieldPattern('state.visualization.layers[3].accessors')).toBe(
      'state.visualization.layers[].accessors'
    );
    expect(toFieldPattern('references[indexpattern-datasource-layer-<layer_0>].id')).toBe(
      'references[].id'
    );
  });
});

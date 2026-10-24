/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ast, AstFunction } from '@kbn/interpreter';
import type { TextBasedPrivateState } from '@kbn/lens-common';
import type { OriginalColumn } from '@kbn/lens-common';
import { toExpression } from './to_expression';

const findExpressionFunction = (
  expression: Ast | null | undefined,
  functionName: string
): AstFunction => {
  const fn = expression?.chain.find((current) => current.function === functionName);

  if (!fn) {
    throw new Error(`Expected expression to contain a "${functionName}" function`);
  }

  return fn;
};

const getIdMap = (
  state: TextBasedPrivateState,
  layerId = 'a'
): Record<string, OriginalColumn[]> => {
  const mapToColumns = findExpressionFunction(toExpression(state, layerId), 'lens_map_to_columns');
  return JSON.parse(mapToColumns.arguments.idMap[0] as string);
};

describe('toExpression', () => {
  const baseState: TextBasedPrivateState = {
    layers: {
      a: {
        columns: [
          {
            columnId: 'a',
            fieldName: '@timestamp',
            meta: {
              type: 'date',
            },
          },
        ],
        query: { esql: 'FROM foo' },
        index: '1',
      },
    },
    indexPatternRefs: [{ id: '1', title: 'foo' }],
  };

  it('builds static thresholds locally without executing the query', () => {
    const state: TextBasedPrivateState = {
      ...baseState,
      layers: {
        a: {
          ...baseState.layers.a,
          columns: [
            {
              columnId: 'threshold',
              fieldName: '42',
              operationType: 'static_value',
              params: { value: '42' },
            },
          ],
        },
      },
    };
    const expression = toExpression(state, 'a');
    expect(expression?.chain.map(({ function: name }) => name)).toEqual([
      'createTable',
      'mathColumn',
    ]);
    expect(findExpressionFunction(expression, 'mathColumn').arguments.expression).toEqual(['42']);
  });

  it.each(['bytes', 'percent', 'number'])('formats static-only thresholds as %s', (formatId) => {
    const state: TextBasedPrivateState = {
      ...baseState,
      layers: {
        a: {
          ...baseState.layers.a,
          columns: [
            {
              columnId: 'threshold',
              fieldName: '42',
              operationType: 'static_value',
              params: { value: '42', format: { id: formatId, params: { decimals: 2 } } },
            },
          ],
        },
      },
    };
    const expression = toExpression(state, 'a');

    expect(expression?.chain.map(({ function: name }) => name)).toEqual([
      'createTable',
      'mathColumn',
      'lens_format_column',
    ]);
    expect(findExpressionFunction(expression, 'lens_format_column').arguments).toEqual({
      format: [formatId],
      columnId: ['threshold'],
      decimals: [2],
      suffix: [],
      compact: [],
      pattern: [],
      fromUnit: [],
      toUnit: [],
      parentFormat: [],
    });
  });

  it.each([
    {
      description: 'the form-based default label',
      column: { params: { value: '42' } },
      expectedName: 'Static value: 42',
    },
    {
      description: 'a custom label',
      column: { params: { value: '42' }, label: 'Budget', customLabel: true },
      expectedName: 'Budget',
    },
    {
      description: 'the generic label for an invalid value',
      column: { params: { value: 'abc' } },
      expectedName: 'Static value',
    },
  ])('names static threshold columns with $description', ({ column, expectedName }) => {
    const state: TextBasedPrivateState = {
      ...baseState,
      layers: {
        a: {
          ...baseState.layers.a,
          columns: [
            {
              columnId: 'threshold',
              fieldName: column.params.value,
              operationType: 'static_value',
              ...column,
            },
          ],
        },
      },
    };
    const staticFunction = toExpression(state, 'a')?.chain[1];
    expect(staticFunction?.arguments.name).toEqual([expectedName]);
  });

  it('appends static thresholds after mapping query columns', () => {
    const state: TextBasedPrivateState = {
      ...baseState,
      layers: {
        a: {
          ...baseState.layers.a,
          columns: [
            ...baseState.layers.a.columns,
            {
              columnId: 'threshold',
              fieldName: '42',
              operationType: 'static_value',
              params: { value: '42' },
            },
          ],
        },
      },
    };
    expect(getIdMap(state)).not.toHaveProperty('42');
    expect(findExpressionFunction(toExpression(state, 'a'), 'mathColumn').arguments.id).toEqual([
      'threshold',
    ]);
  });

  it('omits dropPartials from the idMap when it is not set on the column', () => {
    const idMap = getIdMap(baseState);

    expect(idMap['@timestamp'][0]).toEqual({
      id: 'a',
      label: '@timestamp',
      dataType: 'date',
    });
    expect(idMap['@timestamp'][0]).not.toHaveProperty('dropPartials');
  });

  it('includes dropPartials in the idMap when it is set on the column', () => {
    const idMap = getIdMap({
      ...baseState,
      layers: {
        a: {
          ...baseState.layers.a,
          columns: [
            {
              ...baseState.layers.a.columns[0],
              params: { dropPartials: false },
            },
          ],
        },
      },
    });

    expect(idMap['@timestamp'][0]).toEqual({
      id: 'a',
      label: '@timestamp',
      dropPartials: false,
      dataType: 'date',
    });
  });

  it('includes dropPartials in the idMap when it is explicitly set to true', () => {
    const idMap = getIdMap({
      ...baseState,
      layers: {
        a: {
          ...baseState.layers.a,
          columns: [
            {
              ...baseState.layers.a.columns[0],
              params: { dropPartials: true },
            },
          ],
        },
      },
    });

    expect(idMap['@timestamp'][0]).toEqual({
      id: 'a',
      label: '@timestamp',
      dropPartials: true,
      dataType: 'date',
    });
  });
});

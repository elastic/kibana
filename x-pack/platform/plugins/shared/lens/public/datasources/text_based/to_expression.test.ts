/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Ast, AstFunction } from '@kbn/interpreter';
import type { TextBasedPrivateState } from '@kbn/lens-common';
import type { OriginalColumn } from '../../../common/types';
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

  it('omits dropPartials from the idMap when it is not set on the column', () => {
    const idMap = getIdMap(baseState);

    expect(idMap['@timestamp'][0]).toEqual({
      id: 'a',
      label: '@timestamp',
      dataType: 'date',
      operationType: 'literal',
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
      operationType: 'literal',
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
      operationType: 'literal',
    });
  });
});

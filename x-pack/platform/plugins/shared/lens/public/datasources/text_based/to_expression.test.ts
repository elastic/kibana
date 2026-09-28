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

  it('stacks a histogram series before mapping columns on the live query path', () => {
    const expression = toExpression(
      {
        ...baseState,
        layers: {
          a: {
            ...baseState.layers.a,
            histogramOverlay: {
              label: 'pattern',
              values: [1],
              from: '2020-01-01T00:00:00.000Z',
              to: '2020-01-01T01:00:00.000Z',
              isSampled: false,
              timeColumn: 'timestamp',
              totalColumn: 'results',
              overlayColumn: 'overlay',
              remainderColumn: 'remainder',
            },
          },
        },
      },
      'a'
    );
    const stackIndex = expression?.chain.findIndex(
      (fn) => fn.function === 'lens_stack_histogram_series'
    );
    const mapIndex = expression?.chain.findIndex((fn) => fn.function === 'lens_map_to_columns');

    expect(stackIndex).toBeGreaterThanOrEqual(0);
    expect(mapIndex).toBeGreaterThan(stackIndex ?? -1);
  });

  it('omits the stack function when the layer has no overlay', () => {
    const expression = toExpression(baseState, 'a');

    expect(expression?.chain.some((fn) => fn.function === 'lens_stack_histogram_series')).toBe(
      false
    );
  });

  it('omits the stack function when the layer uses a static table', () => {
    const expression = toExpression(
      {
        ...baseState,
        layers: {
          a: {
            ...baseState.layers.a,
            table: { type: 'datatable', columns: [], rows: [] },
            histogramOverlay: {
              label: 'pattern',
              values: [1],
              from: '2020-01-01T00:00:00.000Z',
              to: '2020-01-01T01:00:00.000Z',
              isSampled: false,
              timeColumn: 'timestamp',
              totalColumn: 'results',
              overlayColumn: 'overlay',
              remainderColumn: 'remainder',
            },
          },
        },
      },
      'a'
    );

    expect(expression?.chain[0].function).toBe('var');
    expect(expression?.chain.some((fn) => fn.function === 'lens_stack_histogram_series')).toBe(
      false
    );
  });
});

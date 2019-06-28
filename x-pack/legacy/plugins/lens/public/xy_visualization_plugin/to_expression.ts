/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/common';
import { State } from './types';
import { DatasourcePublicAPI } from '../types';

export const toExpression = (state: State, datasource: DatasourcePublicAPI): Ast => {
  const labels: Partial<Record<string, string>> = {};
  state.y.accessors.forEach(columnId => {
    const operation = datasource.getOperationForColumnId(columnId);
    if (operation && operation.label) {
      labels[columnId] = operation.label;
    }
  });

  return buildExpression(state, labels);
};

export const buildExpression = (
  state: State,
  columnLabels: Partial<Record<string, string>>
): Ast => ({
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'lens_xy_chart',
      arguments: {
        seriesType: [state.seriesType],
        legend: [
          {
            type: 'expression',
            chain: [
              {
                type: 'function',
                function: 'lens_xy_legendConfig',
                arguments: {
                  isVisible: [state.legend.isVisible],
                  position: [state.legend.position],
                },
              },
            ],
          },
        ],
        x: [
          {
            type: 'expression',
            chain: [
              {
                type: 'function',
                function: 'lens_xy_xConfig',
                arguments: {
                  title: [state.x.title],
                  showGridlines: [state.x.showGridlines],
                  position: [state.x.position],
                  accessor: [state.x.accessor],
                  hide: [Boolean(state.x.hide)],
                },
              },
            ],
          },
        ],
        y: [
          {
            type: 'expression',
            chain: [
              {
                type: 'function',
                function: 'lens_xy_yConfig',
                arguments: {
                  title: [state.y.title],
                  showGridlines: [state.y.showGridlines],
                  position: [state.y.position],
                  accessors: state.y.accessors,
                  hide: [Boolean(state.y.hide)],
                  labels: state.y.accessors.map(accessor => {
                    return columnLabels[accessor] || accessor;
                  }),
                },
              },
            ],
          },
        ],
        splitSeriesAccessors: state.splitSeriesAccessors,
        stackAccessors: state.stackAccessors,
      },
    },
  ],
});

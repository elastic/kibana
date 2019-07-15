/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/common';
import { State } from './types';
import { FramePublicAPI } from '../types';

// export const toExpression = (state: State, datasource: DatasourcePublicAPI): Ast => {
export const toExpression = (state: State, frame: FramePublicAPI): Ast => {
  const labels: Partial<Record<string, string>> = {};
  // const datasource = frame.datasourceLayers.first;
  state.layers.forEach(layer => {
    const datasource = frame.datasourceLayers[layer.layerId];
    layer.accessors.forEach(columnId => {
      const operation = datasource.getOperationForColumnId(columnId);
      if (operation && operation.label) {
        labels[columnId] = operation.label;
      }
    });
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
        // x: [
        //   {
        //     type: 'expression',
        //     chain: [
        //       {
        //         type: 'function',
        //         function: 'lens_xy_xConfig',
        //         arguments: {
        //           title: [state.x.title],
        //           showGridlines: [state.x.showGridlines],
        //           position: [state.x.position],
        //           accessor: [state.x.accessor],
        //           hide: [Boolean(state.x.hide)],
        //         },
        //       },
        //     ],
        //   },
        // ],
        layers: state.layers.map(layer => ({
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'lens_xy_layer',
              arguments: {
                title: [layer.title],
                showGridlines: [layer.showGridlines],
                position: [layer.position],
                hide: [Boolean(layer.hide)],

                xAccessor: [layer.xAccessor],
                splitSeriesAccessors: layer.splitSeriesAccessors,
                seriesType: [layer.seriesType],
                labels: layer.accessors.map(accessor => {
                  return columnLabels[accessor] || accessor;
                }),
                accessors: layer.accessors,
              },
            },
          ],
        })),
      },
    },
  ],
});

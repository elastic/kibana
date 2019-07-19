/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/common';
import { State } from './types';
import { FramePublicAPI } from '../types';

export const toExpression = (state: State, frame: FramePublicAPI): Ast | null => {
  const labels: Partial<Record<string, string>> = {};
  if (!state || !state.layers.length) {
    return null;
  }

  state.layers.forEach(layer => {
    const datasource = frame.datasourceLayers[layer.layerId];
    if (!datasource) {
      return;
    }
    layer.accessors.forEach(columnId => {
      const operation = datasource.getOperationForColumnId(columnId);
      if (operation && operation.label) {
        labels[columnId] = operation.label;
      }
    });
  });

  const stateWithValidAccessors = {
    ...state,
    layers: state.layers.map(layer => ({
      ...layer,
      accessors: layer.accessors.filter(accessor =>
        Boolean(frame.datasourceLayers[layer.layerId].getOperationForColumnId(accessor))
      ),
    })),
  };

  return buildExpression(stateWithValidAccessors, labels);
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
        layers: state.layers.map(layer => ({
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'lens_xy_layer',
              arguments: {
                layerId: [layer.layerId],
                datasourceId: [layer.datasourceId],

                title: [layer.title],
                showGridlines: [layer.showGridlines],
                position: [layer.position],
                hide: [Boolean(layer.hide)],

                xAccessor: [layer.xAccessor],
                splitAccessor: [layer.splitAccessor],
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/common';
import { State, LayerConfig } from './types';
import { FramePublicAPI } from '../types';

function xyTitles(layer: LayerConfig, frame: FramePublicAPI) {
  const defaults = {
    xTitle: 'x',
    yTitle: 'y',
  };

  if (!layer || !layer.accessors.length) {
    return defaults;
  }
  const datasource = frame.datasourceLayers[layer.layerId];
  if (!datasource) {
    return defaults;
  }
  const x = datasource.getOperationForColumnId(layer.xAccessor);
  const y = datasource.getOperationForColumnId(layer.accessors[0]);

  return {
    xTitle: x ? x.label : defaults.xTitle,
    yTitle: y ? y.label : defaults.yTitle,
  };
}

export const toExpression = (state: State, frame: FramePublicAPI): Ast | null => {
  if (!state || !state.layers.length) {
    return null;
  }

  const stateWithValidAccessors = {
    ...state,
    layers: state.layers.map(layer => ({
      ...layer,
      accessors: layer.accessors.filter(accessor =>
        Boolean(frame.datasourceLayers[layer.layerId].getOperationForColumnId(accessor))
      ),
    })),
  };

  return buildExpression(stateWithValidAccessors, xyTitles(state.layers[0], frame));
};

export const buildExpression = (
  state: State,
  { xTitle, yTitle }: { xTitle: string; yTitle: string }
): Ast => ({
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'lens_xy_chart',
      arguments: {
        xTitle: [xTitle],
        yTitle: [yTitle],
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

                title: [layer.title],
                showGridlines: [layer.showGridlines],
                position: [layer.position],
                hide: [Boolean(layer.hide)],

                xAccessor: [layer.xAccessor],
                splitAccessor: [layer.splitAccessor],
                seriesType: [layer.seriesType],
                accessors: layer.accessors,
              },
            },
          ],
        })),
      },
    },
  ],
});

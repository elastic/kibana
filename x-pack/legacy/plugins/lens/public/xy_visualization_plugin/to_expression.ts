/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/common';
import { ScaleType } from '@elastic/charts';
import { State, LayerConfig } from './types';
import { FramePublicAPI, DataType } from '../types';

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
    layers: state.layers.map(layer => {
      const datasource = frame.datasourceLayers[layer.layerId];

      const newLayer = { ...layer };

      if (!datasource.getOperationForColumnId(layer.splitAccessor)) {
        delete newLayer.splitAccessor;
      }

      return {
        ...newLayer,
        accessors: layer.accessors.filter(accessor =>
          Boolean(datasource.getOperationForColumnId(accessor))
        ),
      };
    }),
  };

  const dataTypes: Record<string, Record<string, DataType>> = {};
  state.layers.forEach(layer => {
    dataTypes[layer.layerId] = {};
    const datasource = frame.datasourceLayers[layer.layerId];
    datasource.getTableSpec().forEach(column => {
      const operation = frame.datasourceLayers[layer.layerId].getOperationForColumnId(
        column.columnId
      );
      if (operation) {
        dataTypes[layer.layerId][column.columnId] = operation.dataType;
      }
    });
  });

  return buildExpression(
    stateWithValidAccessors,
    xyTitles(state.layers[0], frame),
    dataTypes,
    frame
  );
};

export function getScaleType(dataType: DataType) {
  switch (dataType) {
    case 'boolean':
    case 'string':
      return ScaleType.Ordinal;
    case 'date':
      return ScaleType.Time;
    default:
      return ScaleType.Linear;
  }
}

export const buildExpression = (
  state: State,
  { xTitle, yTitle }: { xTitle: string; yTitle: string },
  dataTypes: Record<string, Record<string, DataType>>,
  frame?: FramePublicAPI
): Ast => ({
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'lens_xy_chart',
      arguments: {
        xTitle: [xTitle],
        yTitle: [yTitle],
        isHorizontal: [state.isHorizontal],
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
        layers: state.layers.map(layer => {
          const columnToLabel: Record<string, string> = {};

          if (frame) {
            const datasource = frame.datasourceLayers[layer.layerId];
            layer.accessors.concat([layer.splitAccessor]).forEach(accessor => {
              const operation = datasource.getOperationForColumnId(accessor);
              if (operation && operation.label) {
                columnToLabel[accessor] = operation.label;
              }
            });
          }

          return {
            type: 'expression',
            chain: [
              {
                type: 'function',
                function: 'lens_xy_layer',
                arguments: {
                  layerId: [layer.layerId],

                  title: [layer.title],
                  hide: [Boolean(layer.hide)],

                  xAccessor: [layer.xAccessor],
                  yScaleType: [getScaleType(dataTypes[layer.layerId][layer.accessors[0]])],
                  xScaleType: [getScaleType(dataTypes[layer.layerId][layer.xAccessor])],
                  splitAccessor: [layer.splitAccessor],
                  seriesType: [layer.seriesType],
                  accessors: layer.accessors,
                  columnToLabel: [JSON.stringify(columnToLabel)],
                },
              },
            ],
          };
        }),
      },
    },
  ],
});

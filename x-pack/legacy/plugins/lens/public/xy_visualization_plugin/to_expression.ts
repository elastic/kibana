/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Ast } from '@kbn/interpreter/common';
import { ScaleType } from '@elastic/charts';
import { State, LayerConfig } from './types';
import { FramePublicAPI, OperationMetadata } from '../types';

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

  const metadata: Record<string, Record<string, OperationMetadata | null>> = {};
  state.layers.forEach(layer => {
    metadata[layer.layerId] = {};
    const datasource = frame.datasourceLayers[layer.layerId];
    datasource.getTableSpec().forEach(column => {
      const operation = frame.datasourceLayers[layer.layerId].getOperationForColumnId(
        column.columnId
      );
      metadata[layer.layerId][column.columnId] = operation;
    });
  });

  return buildExpression(
    stateWithValidAccessors,
    metadata,
    frame,
    xyTitles(state.layers[0], frame)
  );
};

export function toPreviewExpression(state: State, frame: FramePublicAPI) {
  return toExpression(
    {
      ...state,
      layers: state.layers.map(layer => ({ ...layer, hide: true })),
      // hide legend for preview
      legend: {
        ...state.legend,
        isVisible: false,
      },
    },
    frame
  );
}

export function getScaleType(metadata: OperationMetadata | null, defaultScale: ScaleType) {
  if (!metadata) {
    return defaultScale;
  }

  // use scale information if available
  if (metadata.scale === 'ordinal') {
    return ScaleType.Ordinal;
  }
  if (metadata.scale === 'interval' || metadata.scale === 'ratio') {
    return metadata.dataType === 'date' ? ScaleType.Time : ScaleType.Linear;
  }

  // fall back to data type if necessary
  switch (metadata.dataType) {
    case 'boolean':
    case 'string':
    case 'ip':
      return ScaleType.Ordinal;
    case 'date':
      return ScaleType.Time;
    default:
      return ScaleType.Linear;
  }
}

export const buildExpression = (
  state: State,
  metadata: Record<string, Record<string, OperationMetadata | null>>,
  frame?: FramePublicAPI,
  { xTitle, yTitle }: { xTitle: string; yTitle: string } = { xTitle: '', yTitle: '' }
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

          const xAxisOperation =
            frame && frame.datasourceLayers[layer.layerId].getOperationForColumnId(layer.xAccessor);

          const isHistogramDimension = Boolean(
            xAxisOperation &&
              xAxisOperation.isBucketed &&
              xAxisOperation.scale &&
              xAxisOperation.scale !== 'ordinal'
          );

          return {
            type: 'expression',
            chain: [
              {
                type: 'function',
                function: 'lens_xy_layer',
                arguments: {
                  layerId: [layer.layerId],

                  hide: [Boolean(layer.hide)],

                  xAccessor: [layer.xAccessor],
                  yScaleType: [
                    getScaleType(metadata[layer.layerId][layer.accessors[0]], ScaleType.Ordinal),
                  ],
                  xScaleType: [
                    getScaleType(metadata[layer.layerId][layer.xAccessor], ScaleType.Linear),
                  ],
                  isHistogram: [isHistogramDimension],
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

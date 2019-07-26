/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {
  Chart,
  Settings,
  Axis,
  LineSeries,
  getAxisId,
  getSpecId,
  AreaSeries,
  BarSeries,
  Position,
} from '@elastic/charts';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/types';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, IconType } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { LensMultiTable } from '../types';
import { XYArgs, SeriesType, visualizationTypes } from './types';
import { RenderFunction } from '../interpreter_types';

export interface XYChartProps {
  data: LensMultiTable;
  args: XYArgs;
}

export interface XYRender {
  type: 'render';
  as: 'lens_xy_chart_renderer';
  value: XYChartProps;
}

export const xyChart: ExpressionFunction<'lens_xy_chart', LensMultiTable, XYArgs, XYRender> = ({
  name: 'lens_xy_chart',
  type: 'render',
  help: 'An X/Y chart',
  args: {
    xTitle: {
      types: ['string'],
      help: 'X axis title',
    },
    yTitle: {
      types: ['string'],
      help: 'Y axis title',
    },
    legend: {
      types: ['lens_xy_legendConfig'],
      help: 'Configure the chart legend.',
    },
    layers: {
      types: ['lens_xy_layer'],
      help: 'Layers of visual series',
      multi: true,
    },
  },
  context: {
    types: ['lens_multitable'],
  },
  fn(data: LensMultiTable, args: XYArgs) {
    return {
      type: 'render',
      as: 'lens_xy_chart_renderer',
      value: {
        data,
        args,
      },
    };
  },
  // TODO the typings currently don't support custom type args. As soon as they do, this can be removed
} as unknown) as ExpressionFunction<'lens_xy_chart', LensMultiTable, XYArgs, XYRender>;

export interface XYChartProps {
  data: LensMultiTable;
  args: XYArgs;
}

export const xyChartRenderer: RenderFunction<XYChartProps> = {
  name: 'lens_xy_chart_renderer',
  displayName: 'XY Chart',
  help: 'X/Y Chart Renderer',
  validate: () => {},
  reuseDomNode: true,
  render: async (domNode: Element, config: XYChartProps, _handlers: unknown) => {
    ReactDOM.render(<XYChart {...config} />, domNode);
  },
};

function getIconForSeriesType(seriesType: SeriesType): IconType {
  return visualizationTypes.find(c => c.id === seriesType)!.icon || 'empty';
}

export function XYChart({ data, args }: XYChartProps) {
  const { legend, layers } = args;

  if (Object.values(data.tables).some(table => table.rows.length === 0)) {
    const icon: IconType = layers.length > 0 ? getIconForSeriesType(layers[0].seriesType) : 'bar';
    return (
      <EuiFlexGroup gutterSize="s" direction="column" alignItems="center" justifyContent="center">
        <EuiFlexItem>
          <EuiIcon type={icon} color="subdued" size="l" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued" size="xs">
            <FormattedMessage
              id="xpack.lens.xyVisualization.noDataLabel"
              defaultMessage="No results found"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <Chart className="lnsChart">
      <Settings
        showLegend={legend.isVisible}
        legendPosition={legend.position}
        showLegendDisplayValue={false}
        rotation={layers.some(({ seriesType }) => seriesType.includes('horizontal')) ? 90 : 0}
      />

      <Axis
        id={getAxisId('x')}
        position={Position.Bottom}
        title={args.xTitle}
        showGridLines={false}
        hide={layers[0].hide}
      />

      <Axis
        id={getAxisId('y')}
        position={Position.Left}
        title={args.yTitle}
        showGridLines={layers[0].showGridlines}
        hide={layers[0].hide}
      />

      {layers.map(
        ({ splitAccessor, seriesType, accessors, xAccessor, layerId, columnToLabel }, index) => {
          if (!data.tables[layerId]) {
            return;
          }

          const columnToLabelMap = columnToLabel ? JSON.parse(columnToLabel) : {};

          const rows = data.tables[layerId].rows.map(row => {
            const newRow: typeof row = {};

            // Remap data to { 'Count of documents': 5 }
            Object.keys(row).forEach(key => {
              if (columnToLabelMap[key]) {
                newRow[columnToLabelMap[key]] = row[key];
              } else {
                newRow[key] = row[key];
              }
            });
            return newRow;
          });

          const splitAccessorLabel = columnToLabelMap[splitAccessor];
          const yAccessors = accessors.map(accessor => columnToLabelMap[accessor] || accessor);
          const idForLegend = splitAccessorLabel || yAccessors;

          const seriesProps = {
            key: index,
            splitSeriesAccessors: [splitAccessorLabel || splitAccessor],
            stackAccessors: seriesType.includes('stacked') ? [xAccessor] : [],
            id: getSpecId(idForLegend),
            xAccessor,
            yAccessors,
            data: rows,
          };

          return seriesType === 'line' ? (
            <LineSeries {...seriesProps} />
          ) : seriesType === 'bar' ||
            seriesType === 'bar_stacked' ||
            seriesType === 'horizontal_bar' ||
            seriesType === 'horizontal_bar_stacked' ? (
            <BarSeries {...seriesProps} />
          ) : (
            <AreaSeries {...seriesProps} />
          );
        }
      )}
    </Chart>
  );
}

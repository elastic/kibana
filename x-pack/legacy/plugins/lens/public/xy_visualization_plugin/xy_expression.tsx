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
} from '@elastic/charts';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/types';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, IconType } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { XYArgs, SeriesType } from './types';
import { KibanaDatatable } from '../types';
import { RenderFunction } from '../interpreter_types';
import { chartTypeIcons } from './xy_config_panel';

export interface XYChartProps {
  data: KibanaDatatable;
  args: XYArgs;
}

export interface XYRender {
  type: 'render';
  as: 'lens_xy_chart_renderer';
  value: XYChartProps;
}

export const xyChart: ExpressionFunction<'lens_xy_chart', KibanaDatatable, XYArgs, XYRender> = ({
  name: 'lens_xy_chart',
  type: 'render',
  help: 'An X/Y chart',
  args: {
    seriesType: {
      types: ['string'],
      options: [
        'bar',
        'line',
        'area',
        'horizontal_bar',
        'bar_stacked',
        'line_stacked',
        'area_stacked',
        'horizontal_bar_stacked',
      ],
      help: 'The type of chart to display.',
    },
    legend: {
      types: ['lens_xy_legendConfig'],
      help: 'Configure the chart legend.',
    },
    y: {
      types: ['lens_xy_yConfig'],
      help: 'The y axis configuration',
    },
    x: {
      types: ['lens_xy_xConfig'],
      help: 'The x axis configuration',
    },
    splitSeriesAccessors: {
      types: ['string'],
      multi: true,
      help: 'The columns used to split the series.',
    },
  },
  context: {
    types: ['kibana_datatable'],
  },
  fn(data: KibanaDatatable, args: XYArgs) {
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
} as unknown) as ExpressionFunction<'lens_xy_chart', KibanaDatatable, XYArgs, XYRender>;

export interface XYChartProps {
  data: KibanaDatatable;
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
  return chartTypeIcons.find(chartTypeIcon => chartTypeIcon.id === seriesType)!.iconType;
}

export function XYChart({ data, args }: XYChartProps) {
  if (data.rows.length === 0) {
    return (
      <EuiFlexGroup gutterSize="s" direction="column" alignItems="center" justifyContent="center">
        <EuiFlexItem>
          <EuiIcon type={getIconForSeriesType(args.seriesType)} color="subdued" size="l" />
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

  const { legend, x, y, splitSeriesAccessors, seriesType } = args;
  // TODO: Stop mapping data once elastic-charts allows axis naming
  // https://github.com/elastic/elastic-charts/issues/245
  const seriesProps = {
    splitSeriesAccessors,
    stackAccessors: seriesType.includes('stacked') ? [x.accessor] : [],
    id: getSpecId(y.labels.join(',')),
    xAccessor: x.accessor,
    yAccessors: y.labels,
    data: data.rows.map(row => {
      const newRow: typeof row = {};

      // Remap data to { 'Count of documents': 5 }
      Object.keys(row).forEach(key => {
        const labelIndex = y.accessors.indexOf(key);
        if (labelIndex > -1) {
          newRow[y.labels[labelIndex]] = row[key];
        } else {
          newRow[key] = row[key];
        }
      });
      return newRow;
    }),
  };

  return (
    <Chart className="lnsChart">
      <Settings
        showLegend={legend.isVisible}
        legendPosition={legend.position}
        showLegendDisplayValue={false}
        rotation={seriesType.includes('horizontal') ? 90 : 0}
      />

      <Axis
        id={getAxisId('x')}
        position={x.position}
        title={x.title}
        showGridLines={x.showGridlines}
        hide={x.hide}
      />

      <Axis
        id={getAxisId('y')}
        position={y.position}
        title={y.title}
        showGridLines={y.showGridlines}
        hide={y.hide}
      />

      {seriesType === 'line' ? (
        <LineSeries {...seriesProps} />
      ) : seriesType === 'bar' ||
        seriesType === 'bar_stacked' ||
        seriesType === 'horizontal_bar' ||
        seriesType === 'horizontal_bar_stacked' ? (
        <BarSeries {...seriesProps} />
      ) : (
        <AreaSeries {...seriesProps} />
      )}
    </Chart>
  );
}

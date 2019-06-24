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
import { ExpressionFunction, KibanaDatatable } from 'src/legacy/core_plugins/interpreter/types';
import { XYArgs } from './types';
import { RenderFunction } from './plugin';
import { getFormat } from '../../../../../../src/legacy/ui/public/visualize/loader/pipeline_helpers/utilities';

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
      options: ['bar', 'line', 'area'],
      help: 'The type of chart to display.',
    },
    title: {
      types: ['string'],
      help: 'The char title.',
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
    stackAccessors: {
      types: ['string'],
      multi: true,
      help: 'The columns used to stack the series.',
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

export function XYChart({ data, args }: XYChartProps) {
  const { legend, x, y, splitSeriesAccessors, stackAccessors, seriesType } = args;
  const seriesProps = {
    splitSeriesAccessors,
    stackAccessors,
    id: getSpecId(y.accessors.join(',')),
    xAccessor: x.accessor,
    yAccessors: y.accessors,
    data: data.rows,
  };

  const xAxisColumn = data.columns.find(({ id }) => id === x.accessor);
  const xAxisFormatter = getFormat(xAxisColumn ? xAxisColumn.formatterMapping : undefined);

  let yAxisFormatter: ReturnType<typeof getFormat>;
  if (y.accessors.length === 1) {
    const firstYAxisColumn = data.columns.find(({ id }) => id === y.accessors[0]);
    yAxisFormatter = getFormat(firstYAxisColumn ? firstYAxisColumn.formatterMapping : undefined);
  } else {
    // TODO if there are multiple y axes, try to merge the formatters for the axis
    yAxisFormatter = getFormat({ id: 'number' });
  }

  return (
    <Chart className="lnsChart">
      <Settings showLegend={legend.isVisible} legendPosition={legend.position} />

      <Axis
        id={getAxisId('x')}
        position={x.position}
        title={x.title}
        showGridLines={x.showGridlines}
        tickFormat={d => xAxisFormatter.convert(d)}
      />

      <Axis
        id={getAxisId('y')}
        position={y.position}
        title={y.title}
        showGridLines={y.showGridlines}
        tickFormat={d => yAxisFormatter.convert(d)}
      />

      {seriesType === 'line' ? (
        <LineSeries {...seriesProps} />
      ) : seriesType === 'bar' ? (
        <BarSeries {...seriesProps} />
      ) : (
        <AreaSeries {...seriesProps} />
      )}
    </Chart>
  );
}

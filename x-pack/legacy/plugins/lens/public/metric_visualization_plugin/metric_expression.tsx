/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/types';
import { FormatFactory } from 'ui/visualize/loader/pipeline_helpers/utilities';
import { IInterpreterRenderFunction } from '../../../../../../src/legacy/core_plugins/expressions/public/expressions';
import { MetricConfig } from './types';
import { LensMultiTable } from '../types';
import { AutoScale } from './auto_scale';
import { VisualizationContainer } from '../visualization_container';

export interface MetricChartProps {
  data: LensMultiTable;
  args: MetricConfig;
}

export interface MetricRender {
  type: 'render';
  as: 'lens_metric_chart_renderer';
  value: MetricChartProps;
}

export const metricChart: ExpressionFunction<
  'lens_metric_chart',
  LensMultiTable,
  MetricConfig,
  MetricRender
> = ({
  name: 'lens_metric_chart',
  type: 'render',
  help: 'A metric chart',
  args: {
    title: {
      types: ['string'],
      help: 'The chart title.',
    },
    accessor: {
      types: ['string'],
      help: 'The column whose value is being displayed',
    },
    mode: {
      types: ['string'],
      options: ['reduced', 'full'],
      default: 'full',
      help:
        'The display mode of the chart - reduced will only show the metric itself without min size',
    },
  },
  context: {
    types: ['lens_multitable'],
  },
  fn(data: LensMultiTable, args: MetricChartProps) {
    return {
      type: 'render',
      as: 'lens_metric_chart_renderer',
      value: {
        data,
        args,
      },
    };
  },
  // TODO the typings currently don't support custom type args. As soon as they do, this can be removed
} as unknown) as ExpressionFunction<
  'lens_metric_chart',
  LensMultiTable,
  MetricConfig,
  MetricRender
>;

export const getMetricChartRenderer = (
  formatFactory: FormatFactory
): IInterpreterRenderFunction<MetricChartProps> => ({
  name: 'lens_metric_chart_renderer',
  displayName: 'Metric Chart',
  help: 'Metric Chart Renderer',
  validate: () => {},
  reuseDomNode: true,
  render: async (domNode: Element, config: MetricChartProps, _handlers: unknown) => {
    ReactDOM.render(<MetricChart {...config} formatFactory={formatFactory} />, domNode);
  },
});

export function MetricChart({
  data,
  args,
  formatFactory,
}: MetricChartProps & { formatFactory: FormatFactory }) {
  const { title, accessor, mode } = args;
  let value = '-';
  const firstTable = Object.values(data.tables)[0];

  if (firstTable) {
    const column = firstTable.columns[0];
    const row = firstTable.rows[0];
    if (row[accessor]) {
      value =
        column && column.formatHint
          ? formatFactory(column.formatHint).convert(row[accessor])
          : Number(Number(row[accessor]).toFixed(3)).toString();
    }
  }

  return (
    <VisualizationContainer reportTitle={title} className="lnsMetricContainer">
      <AutoScale>
        <div data-test-subj="lns_metric_value" style={{ fontSize: '60pt', fontWeight: 600 }}>
          {value}
        </div>
        {mode === 'full' && (
          <div data-test-subj="lns_metric_title" style={{ fontSize: '24pt' }}>
            {title}
          </div>
        )}
      </AutoScale>
    </VisualizationContainer>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/types';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { MetricConfig } from './types';
import { KibanaDatatable } from '../types';
import { RenderFunction } from './plugin';

export interface MetricChartProps {
  data: KibanaDatatable;
  args: MetricConfig;
}

export interface MetricRender {
  type: 'render';
  as: 'lens_metric_chart_renderer';
  value: MetricChartProps;
}

export const metricChart: ExpressionFunction<
  'lens_metric_chart',
  KibanaDatatable,
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
  },
  context: {
    types: ['kibana_datatable'],
  },
  fn(data: KibanaDatatable, args: MetricChartProps) {
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
  KibanaDatatable,
  MetricConfig,
  MetricRender
>;

export interface MetricChartProps {
  data: KibanaDatatable;
  args: MetricConfig;
}

export const metricChartRenderer: RenderFunction<MetricChartProps> = {
  name: 'lens_metric_chart_renderer',
  displayName: 'Metric Chart',
  help: 'Metric Chart Renderer',
  validate: () => {},
  reuseDomNode: true,
  render: async (domNode: Element, config: MetricChartProps, _handlers: unknown) => {
    ReactDOM.render(<MetricChart {...config} />, domNode);
  },
};

export function MetricChart({ data, args }: MetricChartProps) {
  const { title, accessor } = args;
  const row = data.rows[0];
  // TODO: Use field formatters here...
  const value = Number(Number(row[accessor]).toFixed(3)).toString();

  return (
    <EuiFlexGroup className="lnsChart" alignItems="center" justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        {/* TODO: Auto-scale the text on resizes */}
        <div style={{ textAlign: 'center', fontWeight: 600, fontSize: '60pt' }}>{value}</div>
        <EuiText textAlign="center">{title}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

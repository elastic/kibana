/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  Axis,
  BarSeries,
  Chart as EuiChart,
  LineSeries,
  AreaSeries,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiCallOut, EuiText } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { CatalogComponent, ComponentRenderProps } from '@kbn/a2ui-renderer';

const SERIES = { bar: BarSeries, line: LineSeries, area: AreaSeries };

function isRecordArray(value: unknown): value is Array<Record<string, unknown>> {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item))
  );
}

/**
 * Charts the rows an ES|QL query put in the data model. Deliberately not Lens:
 * the rows are already bound, so the chart is a pure function of them, and the
 * agent only has to name two column names rather than construct a Lens document.
 */
function ChartRenderer({ props, accessibility }: ComponentRenderProps) {
  const theme = useElasticChartsTheme();

  const rows = props.rows;
  const x = typeof props.x === 'string' ? props.x : undefined;
  const y = typeof props.y === 'string' ? props.y : undefined;
  const breakdown = typeof props.breakdown === 'string' ? props.breakdown : undefined;
  const chartType = (['bar', 'line', 'area'] as const).includes(props.chartType as never)
    ? (props.chartType as keyof typeof SERIES)
    : 'bar';

  if (!x || !y) {
    return <EuiCallOut announceOnMount size="s" color="danger" title="Chart needs both x and y" />;
  }

  if (!isRecordArray(rows)) {
    return (
      <EuiText size="s" color="subdued">
        <p>No data.</p>
      </EuiText>
    );
  }

  if (rows.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        <p>The query returned no rows for this time range.</p>
      </EuiText>
    );
  }

  // A time-typed x column should use a time scale so the axis formats as dates.
  const firstX = rows[0][x];
  const xIsTime =
    typeof firstX === 'string' && !Number.isNaN(Date.parse(firstX)) && firstX.includes('T');
  const data = xIsTime ? rows.map((row) => ({ ...row, [x]: Date.parse(String(row[x])) })) : rows;

  const Series = SERIES[chartType];
  // Rotating the whole chart is how Elastic Charts does horizontal bars. It is
  // the right default for comparing named things — a dozen namespace labels
  // collide when they have to fit under a vertical axis.
  const horizontal = props.horizontal === true && !xIsTime;

  return (
    <EuiChart size={{ height: '100%' }} aria-label={accessibility?.label ?? 'Chart'}>
      <Settings
        baseTheme={theme}
        showLegend={Boolean(breakdown)}
        legendPosition={Position.Right}
        rotation={horizontal ? 90 : 0}
      />
      <Axis
        id="x"
        position={horizontal ? Position.Left : Position.Bottom}
        title={typeof props.xTitle === 'string' ? props.xTitle : x}
      />
      <Axis
        id="y"
        position={horizontal ? Position.Bottom : Position.Left}
        title={typeof props.yTitle === 'string' ? props.yTitle : y}
      />
      <Series
        id={y}
        xScaleType={xIsTime ? ScaleType.Time : ScaleType.Ordinal}
        yScaleType={ScaleType.Linear}
        xAccessor={x}
        yAccessors={[y]}
        splitSeriesAccessors={breakdown ? [breakdown] : undefined}
        data={data}
      />
    </EuiChart>
  );
}

export const Chart: CatalogComponent = {
  name: 'Chart',
  render: ChartRenderer,
};

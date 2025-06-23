/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { SeriesColorAccessor } from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';
import { Axis, BarSeries, Chart, Position, ScaleType, Settings, Tooltip } from '@elastic/charts';
import { useElasticChartsTheme } from '@kbn/charts-theme';

import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { Histogram } from '@kbn/ml-chi2test';

import { i18n } from '@kbn/i18n';
import { DataComparisonChartTooltipBody } from '../data_drift_chart_tooltip_body';
import { DATA_COMPARISON_TYPE } from '../constants';
import type { DataDriftField, Feature } from '../types';

import { getFieldFormatType, useFieldFormatter } from './default_value_formatter';
import { NoChartsData } from './no_charts_data';

export const SingleDistributionChart = ({
  data,
  color,
  fieldType,
  secondaryType,
  name,
}: {
  data: Histogram[];
  name: string;
  secondaryType: string;
  color?: SeriesColorAccessor;
  fieldType?: DataDriftField['type'];
  domain?: Feature['domain'];
}) => {
  const chartBaseTheme = useElasticChartsTheme();
  const xAxisFormatter = useFieldFormatter(getFieldFormatType(secondaryType));
  const yAxisFormatter = useFieldFormatter(FIELD_FORMAT_IDS.NUMBER);

  if (data.length === 0) return <NoChartsData textAlign="left" />;

  return (
    <Chart>
      <Tooltip body={DataComparisonChartTooltipBody} />

      <Settings
        baseTheme={chartBaseTheme}
        theme={{
          axes: { gridLine: { horizontal: { visible: false }, vertical: { visible: false } } }, // Hide grid lines
        }}
        locale={i18n.getLocale()}
      />
      <Axis
        id="vertical"
        position={Position.Left}
        tickFormat={yAxisFormatter}
        domain={{ min: 0, max: 1 }}
        hide={true}
      />

      <Axis
        id="bottom"
        position={Position.Bottom}
        tickFormat={xAxisFormatter}
        labelFormat={xAxisFormatter}
        hide={true}
      />

      <BarSeries
        id={`${name}-distr-viz`}
        name={name}
        xScaleType={
          fieldType === DATA_COMPARISON_TYPE.NUMERIC ? ScaleType.Linear : ScaleType.Ordinal
        }
        yScaleType={ScaleType.Linear}
        xAccessor="key"
        yAccessors={['percentage']}
        data={data}
        color={color}
      />
    </Chart>
  );
};

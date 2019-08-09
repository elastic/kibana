/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  DataSeriesColorsValues,
  getAxisId,
  getSpecId,
  Position,
  ScaleType,
  Settings,
  TooltipValueFormatter,
  TooltipValue,
} from '@elastic/charts';

import darkTheme from '@elastic/eui/dist/eui_theme_dark.json';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';

import { MetricDistributionChartTooltipHeader } from './metric_distribution_chart_tooltip_header';
import { useUiChromeContext } from '../../../../contexts/ui/use_ui_chrome_context';
import { kibanaFieldFormat } from '../../../../formatters/kibana_field_format';

export interface MetricDistributionChartData {
  x: number;
  y: number;
  dataMin: number;
  dataMax: number;
  percent: number;
}

interface Props {
  width: number;
  height: number;
  chartData: MetricDistributionChartData[];
  fieldFormat?: any; // Kibana formatter for field being viewed
}

const SPEC_ID = 'metric_distribution';

export const MetricDistributionChart: FC<Props> = ({ width, height, chartData, fieldFormat }) => {
  // This value is shown to label the y axis values in the tooltip.
  // Ideally we wouldn't show these values at all in the tooltip,
  // but this is not yet possible with Elastic charts.
  const seriesName = i18n.translate('xpack.ml.fieldDataCard.metricDistributionChart.seriesName', {
    defaultMessage: 'distribution',
  });

  // TODO - switch to use inline areaSeriesStyle to set series fill once charts version is 8.0.0+
  const IS_DARK_THEME = useUiChromeContext()
    .getUiSettingsClient()
    .get('theme:darkMode');
  const themeName = IS_DARK_THEME ? darkTheme : lightTheme;
  const EVENT_RATE_COLOR = themeName.euiColorVis1;
  const seriesColorValues: DataSeriesColorsValues = {
    colorValues: [],
    specId: getSpecId(SPEC_ID),
  };
  const seriesColors = new Map([[seriesColorValues, EVENT_RATE_COLOR]]);

  const headerFormatter: TooltipValueFormatter = (tooltipData: TooltipValue) => {
    const xValue = tooltipData.value;
    const chartPoint: MetricDistributionChartData | undefined = chartData.find(
      data => data.x === xValue
    );

    return (
      <MetricDistributionChartTooltipHeader
        chartPoint={chartPoint}
        maxWidth={width / 2}
        fieldFormat={fieldFormat}
      />
    );
  };

  return (
    <div style={{ width, height }}>
      <Chart>
        <Settings
          theme={{
            areaSeriesStyle: {
              line: {
                stroke: 'red',
                strokeWidth: 1,
                visible: true,
              },
              point: {
                visible: false,
                radius: 0,
                opacity: 0,
              },
              area: { fill: 'red', visible: true, opacity: 1 },
            },
          }}
          tooltip={{ headerFormatter }}
        />
        <Axis
          id={getAxisId('bottom')}
          position={Position.Bottom}
          tickFormat={d => kibanaFieldFormat(d, fieldFormat)}
        />
        <Axis
          id={getAxisId('left')}
          position={Position.Left}
          tickFormat={d => d.toFixed(3)}
          hide={true}
        />
        <AreaSeries
          id={getSpecId(SPEC_ID)}
          name={seriesName}
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={chartData.length > 0 ? chartData : [{ x: 0, y: 0 }]}
          curve={CurveType.CURVE_STEP_AFTER}
          // TODO - switch to use inline areaSeriesStyle to set series fill once charts version is 8.0.0+
          // areaSeriesStyle={{
          //   line: {
          //     stroke: 'red',
          //     strokeWidth: 0,
          //     visible: false,
          //   },
          //   point: {
          //     visible: false,
          //     radius: 0,
          //     opacity: 0,
          //   },
          //   area: { fill: 'red', visible: true, opacity: 1 },
          // }}
          customSeriesColors={seriesColors}
        />
      </Chart>
    </div>
  );
};

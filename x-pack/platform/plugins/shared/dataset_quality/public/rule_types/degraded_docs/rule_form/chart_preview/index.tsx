/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RectAnnotationDatum, TickFormatter } from '@elastic/charts';
import {
  AnnotationDomainType,
  Axis,
  BarSeries,
  Chart,
  LineAnnotation,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  Tooltip,
  niceTimeFormatter,
} from '@elastic/charts';
import { EuiSpacer, useEuiTheme } from '@elastic/eui';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { IUiSettingsClient } from '@kbn/core/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
import { TimeUnitChar } from '@kbn/response-ops-rule-params/common/utils';
import { Maybe, TimeLabelForData, getDomain } from './chart_preview_helper';

function getTimeZone(uiSettings?: IUiSettingsClient) {
  const kibanaTimeZone = uiSettings?.get<'Browser' | string>(UI_SETTINGS.DATEFORMAT_TZ);
  if (!kibanaTimeZone || kibanaTimeZone === 'Browser') {
    return moment.tz.guess();
  }

  return kibanaTimeZone;
}

interface ChartPreviewProps {
  yTickFormat?: TickFormatter;
  threshold: number[];
  comparator: COMPARATORS;
  uiSettings?: IUiSettingsClient;
  series: Array<{ name: string; data: Array<{ x: number; y: Maybe<number> }> }>;
  timeSize?: number;
  timeUnit?: TimeUnitChar;
  totalGroups: number;
}

export function ChartPreview({
  yTickFormat,
  threshold,
  comparator,
  uiSettings,
  series,
  timeSize = 5,
  timeUnit = 'm',
  totalGroups,
}: ChartPreviewProps) {
  const baseTheme = useElasticChartsTheme();
  const DEFAULT_DATE_FORMAT = 'Y-MM-DD HH:mm:ss';

  const barSeries = useMemo(() => {
    return series.flatMap((serie) =>
      serie.data.map((point) => ({ ...point, groupBy: serie.name }))
    );
  }, [series]);

  const timeZone = getTimeZone(uiSettings);

  const chartSize = 120;

  const { yMax, xMin, xMax } = getDomain(series);

  const chartDomain = {
    max: Math.max(yMax === 0 ? 1 : yMax, Math.max(...threshold)) * 1.1, // Add 10% headroom.
    min: 0,
  };

  const dateFormatter = useMemo(() => niceTimeFormatter([xMin, xMax]), [xMin, xMax]);
  const theme = useEuiTheme();
  const thresholdOpacity = 0.1;

  const [sortedThreshold, setSortedThreshold] = useState(threshold);

  useEffect(() => {
    setSortedThreshold([...threshold].sort((a, b) => a - b));
  }, [threshold]);

  const style = {
    fill: theme.euiTheme.colors.danger,
    line: {
      strokeWidth: 1,
      stroke: theme.euiTheme.colors.danger,
      opacity: 1,
    },
    opacity: thresholdOpacity,
  };

  const rectThresholdToMax = (value: number): RectAnnotationDatum[] => [
    {
      coordinates: {
        x0: xMin,
        x1: xMax,
        y0: value,
        y1: chartDomain.max,
      },
    },
  ];

  const rectThresholdToMin = (value: number): RectAnnotationDatum[] => [
    {
      coordinates: {
        x0: xMin,
        x1: xMax,
        y0: chartDomain.min,
        y1: value,
      },
    },
  ];

  const rectThresholdToThreshold: RectAnnotationDatum[] = [
    {
      coordinates: {
        x0: xMin,
        x1: xMax,
        y0: sortedThreshold[0],
        y1: sortedThreshold[1],
      },
    },
  ];

  return (
    <>
      <EuiSpacer size="m" />
      <Chart
        size={{
          height: chartSize,
        }}
        data-test-subj="ChartPreview"
      >
        <Tooltip
          headerFormatter={({ value }) => {
            const dateFormat =
              (uiSettings && uiSettings.get(UI_SETTINGS.DATE_FORMAT)) || DEFAULT_DATE_FORMAT;
            return moment(value).format(dateFormat);
          }}
        />
        <Settings showLegend={false} locale={i18n.getLocale()} baseTheme={baseTheme} />
        <LineAnnotation
          dataValues={[{ dataValue: sortedThreshold[0] }]}
          domainType={AnnotationDomainType.YDomain}
          id="chart_preview_line_annotation"
          markerPosition="left"
          style={style}
        />
        {comparator !== COMPARATORS.BETWEEN && (
          <RectAnnotation
            dataValues={
              comparator === COMPARATORS.GREATER_THAN ||
              comparator === COMPARATORS.GREATER_THAN_OR_EQUALS
                ? rectThresholdToMax(sortedThreshold[0])
                : rectThresholdToMin(sortedThreshold[0])
            }
            hideTooltips={true}
            id="chart_preview_rect_annotation"
            style={style}
          />
        )}
        {threshold.length > 1 &&
          [COMPARATORS.NOT_BETWEEN, COMPARATORS.BETWEEN].includes(comparator) && (
            <>
              <LineAnnotation
                dataValues={[{ dataValue: sortedThreshold[1] }]}
                domainType={AnnotationDomainType.YDomain}
                id="chart_preview_line_annotation_2"
                markerPosition="left"
                style={style}
              />
              <RectAnnotation
                dataValues={
                  comparator === COMPARATORS.NOT_BETWEEN
                    ? rectThresholdToMax(sortedThreshold[1])
                    : rectThresholdToThreshold
                }
                hideTooltips={true}
                id="chart_preview_rect_annotation_2"
                style={style}
              />
            </>
          )}
        <Axis
          id="chart_preview_x_axis"
          position={Position.Bottom}
          showOverlappingTicks={true}
          tickFormat={dateFormatter}
        />
        <Axis
          id="chart_preview_y_axis"
          position={Position.Left}
          tickFormat={yTickFormat}
          ticks={5}
          domain={chartDomain}
        />
        <BarSeries
          id="chart_preview_bar_series"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          splitSeriesAccessors={['groupBy']}
          data={barSeries}
          barSeriesStyle={{
            rectBorder: {
              strokeWidth: 1,
              visible: true,
            },
            rect: {
              opacity: 1,
            },
          }}
          timeZone={timeZone}
        />
      </Chart>
      {series.length > 0 && (
        <TimeLabelForData
          field={'@timestamp'}
          timeSize={timeSize}
          timeUnit={timeUnit}
          series={series.length}
          totalGroups={totalGroups}
        />
      )}
    </>
  );
}

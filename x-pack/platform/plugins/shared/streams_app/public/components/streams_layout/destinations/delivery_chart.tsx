/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  TooltipStickTo,
  niceTimeFormatter,
} from '@elastic/charts';
import type { BrushEndListener, XYBrushEvent } from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import type { DeliverySeriesView } from '../../../services/unit_stats_client/types';
import { getChartTimeZone } from '../../stream_detail_overview/ingest_rate_chart';

const CHART_HEIGHT = 200;

interface DeliveryBucket {
  x: number;
  delivered: number;
  authentication: number;
  authorization: number;
  other: number;
}

/**
 * Every bucket of the window, in order, with the counts split into what was delivered, the two
 * failure classes and the failures of other causes. A bucket with no point had no attempts, so it
 * is 0. The buckets are on the grid of `bucketMs` that the series uses.
 */
export const toDeliveryBuckets = ({
  bucketMs,
  window,
  points,
}: DeliverySeriesView): DeliveryBucket[] => {
  const bucketOf = (time: number) => Math.floor(time / bucketMs) * bucketMs;
  const byBucket = new Map(points.map((point) => [bucketOf(Date.parse(point.start)), point]));
  const end = Date.parse(window.end);

  const buckets: DeliveryBucket[] = [];
  for (let x = bucketOf(Date.parse(window.start)); x < end; x += bucketMs) {
    const point = byBucket.get(x);
    buckets.push({
      x,
      delivered: point ? Math.max(0, point.total - point.failed) : 0,
      authentication: point?.authentication ?? 0,
      authorization: point?.authorization ?? 0,
      other: point ? Math.max(0, point.failed - point.authentication - point.authorization) : 0,
    });
  }
  return buckets;
};

/**
 * What was attempted in each bucket of the window, as stacked bars: what was delivered, then the
 * authentication and authorization failures, then the failures of other causes. It follows the
 * documents chart of the flyout, so the two read alike: the same height, axes and tooltip, and
 * the delivered bars in the same color. `onBrushEnd` is called with the range that the user selects
 * by dragging over the chart, to change the time range of the page.
 */
export function DeliveryChart({
  series,
  onBrushEnd,
  dataTestSubj = 'streamsDestinationDeliveryChart',
}: {
  series: DeliverySeriesView;
  onBrushEnd?: (range: { from: string; to: string }) => void;
  dataTestSubj?: string;
}) {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = useElasticChartsTheme();
  const {
    core: { uiSettings },
  } = useKibana();

  const timeZone = useMemo(() => getChartTimeZone(uiSettings), [uiSettings]);
  const data = useMemo(() => toDeliveryBuckets(series), [series]);

  const start = Date.parse(series.window.start);
  const end = Date.parse(series.window.end);
  const xFormatter = niceTimeFormatter([start, end]);

  const handleBrushEnd = useCallback<BrushEndListener>(
    (brushEvent) => {
      const { x } = brushEvent as XYBrushEvent;
      if (!x || !onBrushEnd) return;
      const [min, max] = x;
      onBrushEnd({ from: new Date(min).toISOString(), to: new Date(max).toISOString() });
    },
    [onBrushEnd]
  );

  const bars = [
    {
      id: 'delivered',
      name: i18n.translate('xpack.streams.unitStats.deliveryChart.delivered', {
        defaultMessage: 'Delivered',
      }),
      color: euiTheme.colors.vis.euiColorVis0,
    },
    {
      id: 'authentication',
      name: i18n.translate('xpack.streams.unitStats.deliveryChart.authentication', {
        defaultMessage: 'Authentication',
      }),
      color: euiTheme.colors.vis.euiColorVisDanger0,
    },
    {
      id: 'authorization',
      name: i18n.translate('xpack.streams.unitStats.deliveryChart.authorization', {
        defaultMessage: 'Authorization',
      }),
      color: euiTheme.colors.vis.euiColorVisWarning0,
    },
    {
      id: 'other',
      name: i18n.translate('xpack.streams.unitStats.deliveryChart.other', {
        defaultMessage: 'Other failures',
      }),
      color: euiTheme.colors.vis.euiColorVisGrey1,
    },
  ] as const;

  return (
    <div data-test-subj={dataTestSubj}>
      <Chart size={{ width: '100%', height: CHART_HEIGHT }}>
        <Settings
          showLegend
          legendPosition={Position.Right}
          xDomain={{ min: start, max: end, minInterval: series.bucketMs }}
          locale={i18n.getLocale()}
          baseTheme={chartBaseTheme}
          onBrushEnd={onBrushEnd ? handleBrushEnd : undefined}
          allowBrushingLastHistogramBin
        />
        <Tooltip stickTo={TooltipStickTo.Top} headerFormatter={({ value }) => xFormatter(value)} />
        <Axis
          id="x-axis"
          position={Position.Bottom}
          showOverlappingTicks
          tickFormat={xFormatter}
          gridLine={{ visible: false }}
        />
        <Axis
          id="y-axis"
          ticks={3}
          position={Position.Left}
          tickFormat={(value) => String(value)}
        />
        {bars.map(({ id, name, color }) => (
          <BarSeries
            key={id}
            id={id}
            name={name}
            color={color}
            timeZone={timeZone}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={[id]}
            stackAccessors={['x']}
            data={data}
            enableHistogramMode
          />
        ))}
      </Chart>
    </div>
  );
}

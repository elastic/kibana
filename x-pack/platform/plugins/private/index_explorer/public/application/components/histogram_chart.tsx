/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  Axis,
  Chart,
  HistogramBarSeries,
  Position,
  ScaleType,
  Settings,
  niceTimeFormatter,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { HistogramResponse } from '../../../common/types';
import { i18nTexts } from '../translations';

const CHART_HEIGHT = 140;

interface HistogramChartProps {
  readonly histogram: HistogramResponse;
  /** Called with the brushed range in epoch milliseconds. */
  readonly onBrush: (from: number, to: number) => void;
}

/** Document counts over time; drag across the bars to filter to a time range. */
export function HistogramChart({
  histogram: { buckets, intervalMs },
  onBrush,
}: HistogramChartProps) {
  const baseTheme = useElasticChartsTheme();
  const first = buckets[0]?.timestamp ?? 0;
  const last = (buckets[buckets.length - 1]?.timestamp ?? 0) + (intervalMs ?? 0);

  return (
    <Chart size={{ width: '100%', height: CHART_HEIGHT }} data-test-subj="indexExplorerHistogram">
      <Settings
        baseTheme={baseTheme}
        locale={i18n.getLocale()}
        showLegend={false}
        xDomain={{ min: first, max: last, minInterval: intervalMs }}
        onBrushEnd={(event) => {
          if ('x' in event && event.x && !('cells' in event)) {
            const [from, to] = event.x;
            onBrush(from, to);
          }
        }}
      />
      <Axis id="count" position={Position.Left} ticks={3} integersOnly />
      <Axis
        id="time"
        position={Position.Bottom}
        tickFormat={niceTimeFormatter([first, last])}
        showOverlappingTicks
      />
      <HistogramBarSeries
        id="documents"
        name={i18nTexts.histogramSeriesName}
        xScaleType={ScaleType.Time}
        yScaleType={ScaleType.Linear}
        xAccessor="timestamp"
        yAccessors={['count']}
        data={buckets}
      />
    </Chart>
  );
}

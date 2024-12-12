/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';

import { EuiFlexItem, EuiPanel, EuiTitle, useEuiTheme } from '@elastic/eui';
import {
  Chart,
  Axis,
  BarSeries,
  Settings,
  ScaleType,
  niceTimeFormatter,
  DARK_THEME,
  LIGHT_THEME,
  LineSeries,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { LegendAction } from './legend_action';
import { type MetricTypes, type MetricSeries } from '../../../common/rest_types';
import { formatBytes } from '../../utils/format_bytes';

// TODO: Remove this when we have a title for each metric type
type ChartKey = Extract<MetricTypes, 'ingest_rate' | 'storage_retained'>;
export const chartKeyToTitleMap: Record<ChartKey, string> = {
  ingest_rate: i18n.translate('xpack.dataUsage.charts.ingestedMax', {
    defaultMessage: 'Data Ingested',
  }),
  storage_retained: i18n.translate('xpack.dataUsage.charts.retainedMax', {
    defaultMessage: 'Data Retained in Storage',
  }),
};

interface ChartPanelProps {
  metricType: MetricTypes;
  series: MetricSeries[];
  idx: number;
  popoverOpen: string | null;
  togglePopover: (streamName: string | null) => void;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({
  metricType,
  series,
  idx,
  popoverOpen,
  togglePopover,
}) => {
  const theme = useEuiTheme();

  const chartTimestamps = series.flatMap((stream) => stream.data.map((d) => d.x));

  const [minTimestamp, maxTimestamp] = [Math.min(...chartTimestamps), Math.max(...chartTimestamps)];

  const tickFormat = useMemo(
    () => niceTimeFormatter([minTimestamp, maxTimestamp]),
    [minTimestamp, maxTimestamp]
  );

  // Calculate the total for each time bucket
  const totalSeries = useMemo(() => {
    const totalsMap = new Map<number, number>();

    series.forEach((stream) => {
      stream.data.forEach((point) => {
        totalsMap.set(point.x, (totalsMap.get(point.x) || 0) + point.y);
      });
    });

    return Array.from(totalsMap.entries()).map(([x, y]) => ({ x, y }));
  }, [series]);
  const renderLegendAction = useCallback(
    ({ label }: { label: string }) => {
      if (label === 'Total') {
        return null;
      }
      return (
        <LegendAction
          label={label}
          idx={idx}
          popoverOpen={popoverOpen}
          togglePopover={togglePopover}
        />
      );
    },
    [idx, popoverOpen, togglePopover]
  );

  return (
    <EuiFlexItem grow={false} key={metricType}>
      <EuiPanel hasShadow={false} hasBorder={true}>
        <EuiTitle size="xs">
          <h5>{chartKeyToTitleMap[metricType as ChartKey] || metricType}</h5>
        </EuiTitle>
        <Chart size={{ height: 200 }}>
          <Settings
            theme={theme.colorMode === 'DARK' ? DARK_THEME : LIGHT_THEME}
            showLegend={true}
            legendPosition="right"
            xDomain={{ min: minTimestamp, max: maxTimestamp }}
            legendAction={renderLegendAction}
          />
          <LineSeries
            id="Total"
            name="Total"
            data={totalSeries}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            lineSeriesStyle={{
              line: { strokeWidth: 2 },
              point: { visible: 'always', radius: 5 },
            }}
          />
          {series.map((stream, streamIdx) => (
            <BarSeries
              key={streamIdx}
              id={`${metricType}-${stream.name}`}
              name={stream.name}
              data={stream.data}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              stackAccessors={['x']}
            />
          ))}

          <Axis
            id="bottom-axis"
            position="bottom"
            tickFormat={tickFormat}
            gridLine={{ visible: false }}
          />

          <Axis
            id="left-axis"
            position="left"
            gridLine={{ visible: true }}
            tickFormat={(d) => formatBytes(d)}
          />
        </Chart>
      </EuiPanel>
    </EuiFlexItem>
  );
};

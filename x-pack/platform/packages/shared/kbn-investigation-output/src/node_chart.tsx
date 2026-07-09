/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  AnnotationDomainType,
  Axis,
  BarSeries,
  Chart,
  CurveType,
  LineAnnotation,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  Tooltip,
  niceTimeFormatter,
  type PartialTheme,
} from '@elastic/charts';
import { EuiIcon, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import type { InvestigationChart } from '@kbn/significant-events-schema';

const CHART_HEIGHT = 132;

/**
 * Renders the small self-contained chart the investigation agent embedded on a trail node —
 * the series data is inline (already downsampled by the agent), so no data fetching happens
 * here. Timestamps arrive as ISO strings and are parsed to epoch millis for the time axis.
 */
export const NodeChart: React.FC<{ chart: InvestigationChart }> = ({ chart }) => {
  const baseTheme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();

  const series = useMemo(
    () =>
      chart.series
        .map((entry, index) => ({
          id: entry.name ?? `series-${index}`,
          data: entry.points
            .map(({ x, y }) => ({ x: Date.parse(x), y }))
            .filter(({ x }) => !Number.isNaN(x))
            .sort((a, b) => a.x - b.x),
        }))
        .filter((entry) => entry.data.length > 0),
    [chart.series]
  );

  const annotations = useMemo(
    () =>
      (chart.annotations ?? [])
        .map(({ x, label }) => ({ x: Date.parse(x), label }))
        .filter(({ x }) => !Number.isNaN(x)),
    [chart.annotations]
  );

  const [xMin, xMax] = useMemo(() => {
    const xs = series.flatMap((entry) => entry.data.map(({ x }) => x));
    return [Math.min(...xs), Math.max(...xs)];
  }, [series]);

  const xFormatter = useMemo(() => niceTimeFormatter([xMin, xMax]), [xMin, xMax]);

  if (series.length === 0) {
    return null;
  }

  const chartTheme: PartialTheme = {
    chartMargins: { left: 0, right: 0, top: 8, bottom: 0 },
    background: { color: 'transparent' },
    lineSeriesStyle: { point: { opacity: 0 } },
    axes: {
      axisLine: { visible: false },
      tickLine: { visible: false },
      gridLine: {
        horizontal: { visible: true, dash: [4, 4] },
        vertical: { visible: false },
      },
    },
  };

  const SeriesComponent = chart.type === 'bar' ? BarSeries : LineSeries;

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="s" data-test-subj="investigationNodeChart">
      {chart.title && (
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            margin-bottom: ${euiTheme.size.xs};
          `}
        >
          <strong>{chart.title}</strong>
          {chart.unit ? ` (${chart.unit})` : null}
        </EuiText>
      )}
      <Chart size={{ width: '100%', height: CHART_HEIGHT }}>
        <Tooltip headerFormatter={({ value }) => xFormatter(value)} />
        <Settings
          baseTheme={baseTheme}
          theme={chartTheme}
          showLegend={series.length > 1}
          legendPosition={Position.Bottom}
          locale={i18n.getLocale()}
        />
        <Axis id="x" position={Position.Bottom} tickFormat={xFormatter} ticks={4} />
        <Axis id="y" position={Position.Left} ticks={3} />
        {series.map((entry) => (
          <SeriesComponent
            key={entry.id}
            id={entry.id}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            data={entry.data}
            curve={CurveType.CURVE_MONOTONE_X}
          />
        ))}
        {annotations.map((annotation, index) => (
          <LineAnnotation
            key={`${annotation.x}-${index}`}
            id={`annotation-${index}`}
            domainType={AnnotationDomainType.XDomain}
            dataValues={[{ dataValue: annotation.x, details: annotation.label }]}
            marker={<EuiIcon type="dot" color={euiTheme.colors.accent} />}
            markerPosition={Position.Top}
            style={{
              line: {
                strokeWidth: 1.5,
                stroke: euiTheme.colors.accent,
                opacity: 0.8,
              },
            }}
          />
        ))}
      </Chart>
    </EuiPanel>
  );
};

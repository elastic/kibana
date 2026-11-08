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
  LineAnnotation,
  LineSeries,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  niceTimeFormatter,
} from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { getTimeZone } from '@kbn/visualization-utils';
import moment from 'moment-timezone';
import type { EvidenceChart as EvidenceChartSpec } from '../../common/evidence';

const CHART_HEIGHT = 140;
/** Room above the plot for point annotation markers, which are drawn above its top edge. */
const ANNOTATION_MARKER_MARGIN = 16;

/** The label the recorder gives the moment an alert fired; it gets Kibana's alert icon. */
const isAlertFired = (label: string): boolean => /^alert fired\b/i.test(label.trim());

type YAxisUnit = NonNullable<EvidenceChartSpec['y_axis']['unit']>;

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 2,
});

const formatBytes = (value: number): string => {
  let scaled = Math.abs(value);
  let unitIndex = 0;
  while (scaled >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    scaled /= 1024;
    unitIndex++;
  }
  const sign = value < 0 ? '-' : '';
  return `${sign}${Number(scaled.toFixed(1))} ${BYTE_UNITS[unitIndex]}`;
};

const Y_AXIS_FORMATTERS: Record<YAxisUnit, (value: number) => string> = {
  number: (value) => compactNumber.format(value),
  percent: (value) => `${compactNumber.format(value)}%`,
  bytes: formatBytes,
  ms: (value) => `${compactNumber.format(value)} ms`,
  s: (value) => `${compactNumber.format(value)} s`,
};

interface ChartDatum {
  x: number | string;
  y: number;
}

/** Converts an x value to what the x scale expects; `undefined` when a time value is unparseable. */
const toXValue = (
  x: string,
  isTime: boolean,
  referenceTime?: string
): number | string | undefined => {
  if (!isTime) {
    return x;
  }
  // A bare clock time, "16:30" or "16:30Z", is what a model often writes for a short window.
  // Read it on the day of the thing the chart explains, as UTC, which is how such times are given.
  const clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(?:Z|UTC)?$/i.exec(x.trim());
  if (clock && referenceTime && !Number.isNaN(Date.parse(referenceTime))) {
    const day = new Date(referenceTime).toISOString().slice(0, 10);
    const [, hours, minutes, seconds = '00'] = clock;
    const parsed = Date.parse(`${day}T${hours.padStart(2, '0')}:${minutes}:${seconds}Z`);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  // Epoch seconds or milliseconds, as a bucket key is often written.
  const timestamp = /^\d{10}(\d{3})?$/.test(x.trim())
    ? Number(x.trim()) * (x.trim().length === 10 ? 1000 : 1)
    : Date.parse(x);
  return Number.isNaN(timestamp) ? undefined : timestamp;
};

export interface EvidenceChartProps {
  chart: EvidenceChartSpec;
  /** When the thing the chart explains happened; dates a time written without one. */
  referenceTime?: string;
}

/** Used when no Kibana `dateFormat` setting is available, e.g. outside a Kibana context. */
const FALLBACK_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss';

/**
 * The Kibana `dateFormat:tz` time zone and `dateFormat` pattern, so evidence charts render times
 * like every other chart in Kibana. Fall back to the browser time zone and a fixed pattern outside
 * a Kibana context that provides `uiSettings`.
 */
const useChartTimeSettings = (): { timeZone: string; dateFormat: string } => {
  const { uiSettings } = useKibana<{ uiSettings?: IUiSettingsClient }>().services;
  return useMemo(
    () => ({
      timeZone: uiSettings ? getTimeZone(uiSettings) : moment.tz.guess(true),
      dateFormat: uiSettings?.get<string>('dateFormat') || FALLBACK_DATE_FORMAT,
    }),
    [uiSettings]
  );
};

/**
 * Renders the static chart spec an investigation attaches to a piece of evidence. The data points
 * travel with the spec, so the chart looks the same regardless of where the data came from.
 */
export const EvidenceChart: React.FC<EvidenceChartProps> = ({ chart, referenceTime }) => {
  const { euiTheme } = useEuiTheme();
  const baseTheme = useElasticChartsTheme();
  const { timeZone, dateFormat } = useChartTimeSettings();
  const isTime = chart.x_axis.type === 'time';
  const yFormatter = Y_AXIS_FORMATTERS[chart.y_axis.unit ?? 'number'];

  const series = useMemo(
    () =>
      chart.series.map((entry, index) => ({
        id: `series-${index}`,
        name: entry.name,
        data: entry.points.reduce<ChartDatum[]>((data, { x, y }) => {
          const xValue = toXValue(x, isTime, referenceTime);
          if (xValue !== undefined && Number.isFinite(y)) {
            data.push({ x: xValue, y });
          }
          return data;
        }, []),
      })),
    [chart.series, isTime, referenceTime]
  );

  const xFormatter = useMemo(() => {
    if (!isTime) {
      return undefined;
    }
    const timestamps = series.flatMap(({ data }) => data.map(({ x }) => x as number));
    return timestamps.length > 0
      ? niceTimeFormatter([Math.min(...timestamps), Math.max(...timestamps)])
      : undefined;
  }, [isTime, series]);

  const { pointAnnotations, rangeAnnotations } = useMemo(() => {
    const points: Array<{
      dataValue: number | string;
      details: string;
      header: string;
      isAlert: boolean;
      tone?: 'success' | 'danger';
    }> = [];
    const ranges: Array<{
      coordinates: { x0: number | string; x1: number | string };
      details: string;
      tone?: 'success' | 'danger';
    }> = [];
    for (const annotation of chart.annotations ?? []) {
      const start = toXValue(annotation.x, isTime, referenceTime);
      if (start === undefined) {
        continue;
      }
      const end = annotation.x_end ? toXValue(annotation.x_end, isTime, referenceTime) : undefined;
      if (end !== undefined) {
        ranges.push({
          coordinates: { x0: start, x1: end },
          details: annotation.label,
          tone: annotation.tone,
        });
      } else {
        // elastic-charts titles a point annotation's tooltip with `header`, falling back to the
        // raw data value — epoch milliseconds on a time axis.
        const header =
          typeof start === 'number' ? moment.tz(start, timeZone).format(dateFormat) : start;
        points.push({
          dataValue: start,
          details: annotation.label,
          header,
          isAlert: isAlertFired(annotation.label),
          tone: annotation.tone,
        });
      }
    }
    return { pointAnnotations: points, rangeAnnotations: ranges };
  }, [chart.annotations, isTime, timeZone, dateFormat, referenceTime]);

  const thresholdLines = (chart.thresholds ?? []).map(({ y, label }) => ({
    dataValue: y,
    details: label,
  }));

  const hasAnnotations = pointAnnotations.length > 0 || rangeAnnotations.length > 0;
  // Point annotation markers are drawn above the plot, so reserve room for them there.
  const hasPointAnnotations = pointAnnotations.length > 0;
  const chartTheme = useMemo(
    () =>
      hasPointAnnotations
        ? {
            chartMargins: {
              ...baseTheme.chartMargins,
              top: baseTheme.chartMargins.top + ANNOTATION_MARKER_MARGIN,
            },
          }
        : undefined,
    [baseTheme.chartMargins, hasPointAnnotations]
  );

  const xScaleType = isTime ? ScaleType.Time : ScaleType.Ordinal;
  const hasData = series.some(({ data }) => data.length > 0);
  const showLegend = series.length > 1;
  // Series take the theme's palette colors in order, so the legend can be rendered with EUI and
  // wrap freely in a narrow flyout instead of competing with the plot for a fixed height.
  const seriesColors = baseTheme.colors.vizColors;

  return (
    <div data-test-subj="investigationEvidenceChart">
      <EuiText size="xs">
        <strong>{chart.title}</strong>
      </EuiText>
      {hasData && (
        <>
          <EuiSpacer size="xs" />
          <Chart size={{ height: CHART_HEIGHT }}>
            <Settings baseTheme={baseTheme} theme={chartTheme} showLegend={false} />
            <Axis
              id="x"
              position={Position.Bottom}
              title={chart.x_axis.label}
              tickFormat={xFormatter}
            />
            <Axis
              id="y"
              position={Position.Left}
              title={chart.y_axis.label}
              tickFormat={yFormatter}
              ticks={3}
              gridLine={{ visible: true }}
            />
            {series.map(({ id, name, data }, index) =>
              chart.type === 'bar' ? (
                <BarSeries
                  key={id}
                  id={id}
                  name={name}
                  color={seriesColors[index % seriesColors.length]}
                  data={data}
                  xAccessor="x"
                  yAccessors={['y']}
                  xScaleType={xScaleType}
                  yScaleType={ScaleType.Linear}
                  timeZone={timeZone}
                  stackAccessors={chart.stacked ? ['x'] : undefined}
                />
              ) : (
                <LineSeries
                  key={id}
                  id={id}
                  name={name}
                  color={seriesColors[index % seriesColors.length]}
                  data={data}
                  xAccessor="x"
                  yAccessors={['y']}
                  xScaleType={xScaleType}
                  yScaleType={ScaleType.Linear}
                  timeZone={timeZone}
                />
              )
            )}
            {[
              { tone: undefined, color: euiTheme.colors.accent },
              { tone: 'success' as const, color: euiTheme.colors.success },
              { tone: 'danger' as const, color: euiTheme.colors.danger },
            ].map(({ tone, color }) => {
              const values = pointAnnotations.filter(
                (point) => !point.isAlert && point.tone === tone
              );
              return (
                values.length > 0 && (
                  <LineAnnotation
                    key={tone ?? 'default'}
                    id={`evidence-point-annotations-${tone ?? 'default'}`}
                    domainType={AnnotationDomainType.XDomain}
                    dataValues={values}
                    marker={<EuiIcon type="dot" color={color} aria-hidden={true} />}
                    markerPosition={Position.Top}
                    style={{ line: { strokeWidth: 1, stroke: color, opacity: 1 } }}
                  />
                )
              );
            })}
            {pointAnnotations.some((point) => point.isAlert) && (
              <LineAnnotation
                id="evidence-point-annotations-alert"
                domainType={AnnotationDomainType.XDomain}
                dataValues={pointAnnotations.filter((point) => point.isAlert)}
                marker={
                  <EuiIcon type="warning" color={euiTheme.colors.danger} aria-hidden={true} />
                }
                markerPosition={Position.Top}
                style={{ line: { strokeWidth: 1, stroke: euiTheme.colors.danger, opacity: 1 } }}
              />
            )}
            {[
              { tone: undefined, color: euiTheme.colors.accent },
              { tone: 'success' as const, color: euiTheme.colors.success },
              { tone: 'danger' as const, color: euiTheme.colors.danger },
            ].map(({ tone, color }) => {
              const values = rangeAnnotations.filter((range) => range.tone === tone);
              return (
                values.length > 0 && (
                  <RectAnnotation
                    key={tone ?? 'default'}
                    id={`evidence-range-annotations-${tone ?? 'default'}`}
                    dataValues={values}
                    style={{ fill: color, opacity: 0.1 }}
                  />
                )
              );
            })}
            {thresholdLines.length > 0 && (
              <LineAnnotation
                id="evidence-thresholds"
                domainType={AnnotationDomainType.YDomain}
                dataValues={thresholdLines}
                style={{
                  line: {
                    strokeWidth: 1,
                    stroke: euiTheme.colors.danger,
                    dash: [4, 3],
                    opacity: 1,
                  },
                }}
              />
            )}
          </Chart>
          {(showLegend || hasAnnotations) && (
            <EuiFlexGroup
              gutterSize="s"
              wrap
              css={css`
                margin-top: ${euiTheme.size.s};
              `}
              responsive={false}
              data-test-subj="investigationEvidenceChartLegend"
            >
              {showLegend &&
                series.map(({ id, name }, index) => (
                  <EuiFlexItem key={id} grow={false}>
                    <EuiHealth color={seriesColors[index % seriesColors.length]} textSize="xs">
                      {name}
                    </EuiHealth>
                  </EuiFlexItem>
                ))}
              {pointAnnotations.map(({ details, isAlert }, index) => (
                <EuiFlexItem
                  key={`point-${index}`}
                  grow={false}
                  data-test-subj="investigationEvidenceChartAnnotation"
                >
                  {isAlert ? (
                    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon
                          type="warning"
                          color={euiTheme.colors.danger}
                          size="s"
                          aria-hidden
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">{details}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ) : (
                    <EuiHealth color={euiTheme.colors.accent} textSize="xs">
                      {details}
                    </EuiHealth>
                  )}
                </EuiFlexItem>
              ))}
              {rangeAnnotations.map(({ details }, index) => (
                <EuiFlexItem
                  key={`range-${index}`}
                  grow={false}
                  data-test-subj="investigationEvidenceChartAnnotation"
                >
                  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type="stop"
                        size="s"
                        color={euiTheme.colors.accent}
                        aria-hidden={true}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">{details}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
        </>
      )}
    </div>
  );
};

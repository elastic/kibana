/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { HeatmapStyle, RecursivePartial } from '@elastic/charts';
import { Chart, Heatmap, Predicate, ScaleType, Settings, Tooltip } from '@elastic/charts';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n as kbnI18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { EpisodeEventRow } from '../../queries/episode_events_query';
import { isSupportedEpisodeSeverity } from '../severity/episode_severity_badge';
import * as i18n from './translations';

interface AlertEpisodeSeverityHeatmapServices {
  charts: ChartsPluginStart;
}

/** Short strip: one heatmap row. Timestamps are rendered outside the chart. */
const CHART_HEIGHT = 20;

type EpisodeSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

const SEVERITY_VALUE: Record<EpisodeSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

interface EpisodeSeverityColorBand {
  start: EpisodeSeverity;
  end: EpisodeSeverity;
}

const EPISODE_SEVERITY_COLOR_BANDS: readonly EpisodeSeverityColorBand[] = [
  { start: 'info', end: 'info' },
  { start: 'low', end: 'low' },
  { start: 'medium', end: 'medium' },
  { start: 'high', end: 'high' },
  { start: 'critical', end: 'critical' },
];

function toChartsNumericColorBands(
  bands: readonly EpisodeSeverityColorBand[],
  colorForSeverity: (severity: EpisodeSeverity) => string
): Array<{ start: number; end: number; color: string; label: string }> {
  return bands.map((band, index) => {
    const severity = band.start;
    const n = SEVERITY_VALUE[severity];
    const isLast = index === bands.length - 1;
    return {
      start: n,
      end: isLast ? Infinity : n + 1,
      color: colorForSeverity(severity),
      label: severityLabel(severity),
    };
  });
}

function severityFromHeatmapValue(value: number): EpisodeSeverity {
  const rounded = Math.round(value);
  if (rounded === 0) return 'info';
  if (rounded === 1) return 'low';
  if (rounded === 2) return 'medium';
  if (rounded === 3) return 'high';
  return 'critical';
}

function severityLabel(severity: EpisodeSeverity): string {
  switch (severity) {
    case 'info':
      return i18n.SEVERITY_HEATMAP_INFO_LABEL;
    case 'low':
      return i18n.SEVERITY_HEATMAP_LOW_LABEL;
    case 'medium':
      return i18n.SEVERITY_HEATMAP_MEDIUM_LABEL;
    case 'high':
      return i18n.SEVERITY_HEATMAP_HIGH_LABEL;
    case 'critical':
      return i18n.SEVERITY_HEATMAP_CRITICAL_LABEL;
    default:
      return severity;
  }
}

function normalizeSeverity(severity: string): EpisodeSeverity {
  return severity.toLowerCase() as EpisodeSeverity;
}

function formatTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
}

function compactAxisTime(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const SEVERITY_Y = 'Severity';

interface HeatmapDatum {
  x: number;
  y: string;
  value: number;
  ts: string;
  severity: EpisodeSeverity;
}

interface HeatmapTableDatum {
  x: string | number;
  y: string | number;
  value: number;
  originalIndex: number;
}

export interface AlertEpisodeSeverityHeatmapProps {
  eventRows: EpisodeEventRow[];
}

export const AlertEpisodeSeverityHeatmap = ({ eventRows }: AlertEpisodeSeverityHeatmapProps) => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana<AlertEpisodeSeverityHeatmapServices>();
  const baseTheme = services.charts.theme.useChartsBaseTheme();

  const data: HeatmapDatum[] = useMemo(() => {
    const rows = eventRows
      .filter((row): row is EpisodeEventRow & { severity: string } =>
        isSupportedEpisodeSeverity(row.severity)
      )
      .map((row, rowIndex) => {
        const { '@timestamp': ts, severity } = row;
        const normalized = normalizeSeverity(severity);
        const tsMs = ts ? Date.parse(ts) : Number.NaN;
        return {
          ts,
          tsMs: Number.isFinite(tsMs) ? tsMs : Number.POSITIVE_INFINITY,
          y: SEVERITY_Y,
          value: SEVERITY_VALUE[normalized],
          severity: normalized,
          rowIndex,
        };
      });

    rows.sort((a, b) => {
      if (a.tsMs !== b.tsMs) return a.tsMs - b.tsMs;
      return a.rowIndex - b.rowIndex;
    });

    return rows.map((row, index) => ({
      x: index,
      y: row.y,
      value: row.value,
      ts: row.ts,
      severity: row.severity,
    }));
  }, [eventRows]);

  const firstTimestamp = data[0]?.ts;
  const lastTimestamp = data.length > 1 ? data[data.length - 1]?.ts : undefined;

  const heatmapTheme: RecursivePartial<HeatmapStyle> = useMemo(
    () => ({
      grid: { stroke: { width: 0 } },
      cell: {
        maxWidth: 'fill',
        maxHeight: 14,
        label: { visible: false },
        border: { strokeWidth: 1, stroke: euiTheme.colors.emptyShade },
      },
      yAxisLabel: { visible: false },
      xAxisLabel: { visible: false },
    }),
    [euiTheme]
  );

  const colorBands = useMemo(
    () =>
      toChartsNumericColorBands(EPISODE_SEVERITY_COLOR_BANDS, (severity) => {
        switch (severity) {
          case 'critical':
            return euiTheme.colors.danger;
          case 'high':
            return euiTheme.colors.warning;
          case 'medium':
            return euiTheme.colors.success;
          case 'low':
            return euiTheme.colors.primary;
          case 'info':
            return euiTheme.colors.lightShade;
          default:
            return euiTheme.colors.lightShade;
        }
      }),
    [euiTheme]
  );

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="alertingV2EpisodeSeverityHeatmap">
      <EuiTitle size="xxs">
        <h2>{i18n.SEVERITY_HEATMAP_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <Chart size={{ height: CHART_HEIGHT }}>
        <Tooltip
          body={({ items: values }) => {
            const tableDatum = values?.[0]?.datum as HeatmapTableDatum | undefined;
            if (tableDatum == null) {
              return null;
            }
            const severity = severityFromHeatmapValue(tableDatum.value);
            const original = data[tableDatum.originalIndex];
            const timeLabel =
              original?.ts && original.ts.length > 0 ? formatTimestamp(original.ts) : '';
            return (
              <div
                css={css`
                  padding: ${euiTheme.size.xs} ${euiTheme.size.s};
                `}
              >
                <EuiText size="xs">
                  <strong>{severityLabel(severity)}</strong>
                  {timeLabel.length > 0 && (
                    <>
                      <br />
                      {timeLabel}
                    </>
                  )}
                </EuiText>
              </div>
            );
          }}
        />
        <Settings
          showLegend={false}
          theme={{ heatmap: heatmapTheme }}
          baseTheme={baseTheme}
          locale={kbnI18n.getLocale()}
        />
        <Heatmap
          id="episode-severity-heatmap"
          colorScale={{ type: 'bands', bands: colorBands }}
          data={data}
          xAccessor="x"
          yAccessor="y"
          valueAccessor="value"
          xScale={{ type: ScaleType.Ordinal }}
          xSortPredicate={Predicate.NumAsc}
          xAxisLabelName=""
          yAxisLabelName=""
        />
      </Chart>
      {(firstTimestamp || lastTimestamp) && (
        <EuiFlexGroup
          justifyContent="spaceBetween"
          responsive={false}
          gutterSize="none"
          css={css`
            padding-top: ${euiTheme.size.xs};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {firstTimestamp ? compactAxisTime(firstTimestamp) : ''}
            </EuiText>
          </EuiFlexItem>
          {lastTimestamp && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {compactAxisTime(lastTimestamp)}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};

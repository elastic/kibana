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
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { EpisodeEventRow } from '@kbn/alerting-v2-episodes-ui/queries/episode_events_query';
import type { AlertEpisodesKibanaServices } from '../../../episodes_kibana_services';

/** Short strip: one heatmap row. Timestamps are rendered outside the chart. */
const CHART_HEIGHT = 20;

const STATUS_VALUE: Record<AlertEpisodeStatus, number> = {
  [ALERT_EPISODE_STATUS.PENDING]: 0,
  [ALERT_EPISODE_STATUS.ACTIVE]: 1,
  [ALERT_EPISODE_STATUS.RECOVERING]: 2,
  [ALERT_EPISODE_STATUS.INACTIVE]: 3,
};

interface EpisodeStatusColorBand {
  start: AlertEpisodeStatus;
  end: AlertEpisodeStatus;
}

const EPISODE_STATUS_COLOR_BANDS: readonly EpisodeStatusColorBand[] = [
  { start: ALERT_EPISODE_STATUS.PENDING, end: ALERT_EPISODE_STATUS.PENDING },
  { start: ALERT_EPISODE_STATUS.ACTIVE, end: ALERT_EPISODE_STATUS.ACTIVE },
  { start: ALERT_EPISODE_STATUS.RECOVERING, end: ALERT_EPISODE_STATUS.RECOVERING },
  { start: ALERT_EPISODE_STATUS.INACTIVE, end: ALERT_EPISODE_STATUS.INACTIVE },
];

function toChartsNumericColorBands(
  bands: readonly EpisodeStatusColorBand[],
  colorForStatus: (status: AlertEpisodeStatus) => string
): Array<{ start: number; end: number; color: string; label: string }> {
  return bands.map((band, index) => {
    const status = band.start;
    const n = STATUS_VALUE[status];
    const isLast = index === bands.length - 1;
    return {
      start: n,
      end: isLast ? Infinity : n + 1,
      color: colorForStatus(status),
      label: statusLabel(status),
    };
  });
}

function statusFromHeatmapValue(value: number): AlertEpisodeStatus {
  const rounded = Math.round(value);
  if (rounded === 0) return ALERT_EPISODE_STATUS.PENDING;
  if (rounded === 1) return ALERT_EPISODE_STATUS.ACTIVE;
  if (rounded === 2) return ALERT_EPISODE_STATUS.RECOVERING;
  return ALERT_EPISODE_STATUS.INACTIVE;
}

function statusLabel(status: AlertEpisodeStatus): string {
  switch (status) {
    case ALERT_EPISODE_STATUS.PENDING:
      return i18n.translate('xpack.alertingV2.episodes.pendingStatusBadgeLabel', {
        defaultMessage: 'Pending',
      });
    case ALERT_EPISODE_STATUS.ACTIVE:
      return i18n.translate('xpack.alertingV2.episodes.activeStatusBadgeLabel', {
        defaultMessage: 'Active',
      });
    case ALERT_EPISODE_STATUS.RECOVERING:
      return i18n.translate('xpack.alertingV2.episodes.recoveringStatusBadgeLabel', {
        defaultMessage: 'Recovering',
      });
    case ALERT_EPISODE_STATUS.INACTIVE:
      return i18n.translate('xpack.alertingV2.episodes.inactiveStatusBadgeLabel', {
        defaultMessage: 'Inactive',
      });
    default:
      return i18n.translate('xpack.alertingV2.episodes.unknownStatusBadgeLabel', {
        defaultMessage: 'Unknown',
      });
  }
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

const LIFECYCLE_Y = 'Lifecycle';

interface HeatmapDatum {
  x: number;
  y: string;
  value: number;
  ts: string;
  status: AlertEpisodeStatus;
}

interface HeatmapTableDatum {
  x: string | number;
  y: string | number;
  value: number;
  originalIndex: number;
}

export interface EpisodeLifecycleHeatmapProps {
  eventRows: EpisodeEventRow[];
}

export const EpisodeLifecycleHeatmap = ({ eventRows }: EpisodeLifecycleHeatmapProps) => {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana<AlertEpisodesKibanaServices>();
  const baseTheme = services.charts.theme.useChartsBaseTheme();

  const data: HeatmapDatum[] = useMemo(() => {
    const rows = eventRows
      .filter((row) => row['episode.status'] in STATUS_VALUE)
      .map((row, rowIndex) => {
        const { '@timestamp': ts, 'episode.status': status } = row;
        const tsMs = ts ? Date.parse(ts) : Number.NaN;
        return {
          ts,
          tsMs: Number.isFinite(tsMs) ? tsMs : Number.POSITIVE_INFINITY,
          y: LIFECYCLE_Y,
          value: STATUS_VALUE[status],
          status,
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
      status: row.status,
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
      toChartsNumericColorBands(EPISODE_STATUS_COLOR_BANDS, (status) => {
        switch (status) {
          case ALERT_EPISODE_STATUS.PENDING:
            return euiTheme.colors.warning;
          case ALERT_EPISODE_STATUS.ACTIVE:
            return euiTheme.colors.danger;
          case ALERT_EPISODE_STATUS.RECOVERING:
            return euiTheme.colors.primary;
          case ALERT_EPISODE_STATUS.INACTIVE:
            return euiTheme.colors.success;
          default:
            return euiTheme.colors.lightShade;
        }
      }),
    [euiTheme]
  );

  if (data.length === 0) {
    return (
      <EuiPanel hasBorder paddingSize="m" data-test-subj="alertingV2EpisodeLifecycleHeatmapEmpty">
        <EuiEmptyPrompt
          title={
            <h2>
              {i18n.translate('xpack.alertingV2.episodes.lifecycleEmptyTitle', {
                defaultMessage: 'No events in this episode yet',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.alertingV2.episodes.lifecycleEmptyBody', {
                defaultMessage: 'Status changes across the episode lifecycle will appear here.',
              })}
            </p>
          }
        />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="alertingV2EpisodeLifecycleHeatmap">
      <EuiTitle size="xxs">
        <h2>
          {i18n.translate('xpack.alertingV2.episodes.lifecycleTitle', {
            defaultMessage: 'Episode timeline',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <Chart size={{ height: CHART_HEIGHT }}>
        <Tooltip
          body={({ items: values }) => {
            const tableDatum = values?.[0]?.datum as HeatmapTableDatum | undefined;
            if (tableDatum == null) {
              return null;
            }
            const status = statusFromHeatmapValue(tableDatum.value);
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
                  <strong>{statusLabel(status)}</strong>
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
          locale={i18n.getLocale()}
        />
        <Heatmap
          id="episode-lifecycle-heatmap"
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

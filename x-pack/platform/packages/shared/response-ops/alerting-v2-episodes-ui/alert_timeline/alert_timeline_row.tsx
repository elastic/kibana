/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  Axis,
  Chart,
  LineSeries,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import type {
  ElementClickListener,
  RectAnnotationDatum,
  XYChartElementEvent,
} from '@elastic/charts';
import { EuiHealth, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { PluginStart } from '@kbn/core-di';
import { useService } from '@kbn/core-di-browser';
import type { AlertTimelineSegment, AlertTimelineSeries } from './types';
import {
  alertTimelineStatusColor,
  alertTimelineStatusLabel,
} from './alert_timeline_status_palette';
import { formatDuration, formatTimestamp } from './alert_timeline_format';

// Render order = paint order. Sibling series declared later paint on top,
// so list lower-priority statuses first and higher-priority ones last —
// when dots collide at the same x, ACTIVE wins over RECOVERING wins over
// PENDING wins over INACTIVE.
const STATUS_ORDER: readonly AlertEpisodeStatus[] = [
  ALERT_EPISODE_STATUS.INACTIVE,
  ALERT_EPISODE_STATUS.PENDING,
  ALERT_EPISODE_STATUS.RECOVERING,
  ALERT_EPISODE_STATUS.ACTIVE,
];

const STATUS_PRIORITY: Record<string, number> = Object.fromEntries(
  STATUS_ORDER.map((s, i) => [s, i])
);

// Rect annotations span a centered horizontal band, not the full row height,
// so the bar reads as a thick line rather than a row-filling block.
const RECT_Y0 = 0.4;
const RECT_Y1 = 0.6;

interface SegmentDetails {
  kind: 'segment';
  episodeId: string;
  status: AlertEpisodeStatus;
  x0Ms: number;
  x1Ms: number;
}

interface TransitionDatum {
  x: number;
  y: number;
  episodeId: string;
  status: AlertEpisodeStatus;
  href?: string;
}

const groupBy = <T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> => {
  return items.reduce((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<K, T[]>);
};

interface TooltipPanelProps {
  euiTheme: EuiThemeComputed;
  status: AlertEpisodeStatus;
  episodeId: string;
  primaryLine: string;
  secondaryLine?: string;
  durationLabel?: string;
}

const TooltipPanel: React.FC<TooltipPanelProps> = ({
  euiTheme,
  status,
  episodeId,
  primaryLine,
  secondaryLine,
  durationLabel,
}) => {
  return (
    <EuiPanel
      paddingSize="none"
      hasBorder
      hasShadow={false}
      color="plain"
      css={css`
        max-width: 280px;
      `}
    >
      <EuiText size="xs">
        <div
          css={css`
            padding: ${euiTheme.size.xs} ${euiTheme.size.s};
            border-bottom: 1px solid ${euiTheme.colors.lightShade};
          `}
        >
          <EuiHealth color={alertTimelineStatusColor(euiTheme, status)} textSize="xs">
            <strong>{alertTimelineStatusLabel(status)}</strong>
          </EuiHealth>
        </div>
        <div
          css={css`
            padding: ${euiTheme.size.xs} ${euiTheme.size.s};
          `}
        >
          <div>{primaryLine}</div>
          {secondaryLine && <div>{secondaryLine}</div>}
          {durationLabel && <div>{durationLabel}</div>}
          <div
            css={css`
              margin-top: ${euiTheme.size.xs};
            `}
          >
            {i18n.translate('xpack.alertingV2.alertTimeline.tooltip.episodeId', {
              defaultMessage: 'Episode id: {id}',
              values: { id: episodeId },
            })}
          </div>
        </div>
      </EuiText>
    </EuiPanel>
  );
};

export interface AlertTimelineRowProps {
  row: AlertTimelineSeries;
  gteMs: number;
  lteMs: number;
  height: number;
  onEpisodeClick?: (episodeId: string) => void;
  getEpisodeHref?: (episodeId: string) => string;
}

/**
 * One series rendered as a thin elastic-charts row: rect annotations color
 * each state segment between consecutive events. A hidden line series
 * anchors the chart's domain since rect annotations alone don't establish
 * one.
 *
 * The row owns its own chrome (top border, height) so callers just render
 * `<AlertTimelineRow ... />` per series with no wrapper.
 */
export const AlertTimelineRow: React.FC<AlertTimelineRowProps> = ({
  row,
  gteMs,
  lteMs,
  height,
  onEpisodeClick,
  getEpisodeHref,
}) => {
  const { euiTheme } = useEuiTheme();
  const charts = useService(PluginStart('charts')) as ChartsPluginStart;
  const baseTheme = charts.theme.useChartsBaseTheme();

  const segmentsByStatus = useMemo(
    () => groupBy<AlertTimelineSegment, AlertEpisodeStatus>(row.segments, (s) => s.status),
    [row.segments]
  );

  const sortedTransitions = useMemo(
    () => [...row.transitions].sort((a, b) => a.tsMs - b.tsMs),
    [row.transitions]
  );

  const handleAnnotationClick = useCallback(
    (annotations: { rects: Array<{ datum: RectAnnotationDatum }> }) => {
      const candidates = annotations.rects
        .map((r) => r.datum?.details as SegmentDetails | undefined)
        .filter((d): d is SegmentDetails => d?.kind === 'segment');

      if (candidates.length === 0 || !onEpisodeClick) return;

      // Match paint order: highest-priority status wins (visually on top).
      // Among equal priority, prefer the most recently started segment.
      candidates.sort((a, b) => {
        const p = (STATUS_PRIORITY[b.status] ?? 0) - (STATUS_PRIORITY[a.status] ?? 0);
        return p !== 0 ? p : b.x0Ms - a.x0Ms;
      });

      onEpisodeClick(candidates[0].episodeId);
    },
    [onEpisodeClick]
  );

  const handleElementClick = useCallback<ElementClickListener>(
    (elements) => {
      if (!onEpisodeClick) return;

      const candidates = elements
        .filter((el): el is XYChartElementEvent => Array.isArray(el))
        .map(([geometry]) => geometry?.datum as TransitionDatum | undefined)
        .filter((d): d is TransitionDatum => d != null && d.episodeId != null);

      if (candidates.length === 0) return;

      candidates.sort((a, b) => {
        const p = (STATUS_PRIORITY[b.status] ?? 0) - (STATUS_PRIORITY[a.status] ?? 0);
        return p !== 0 ? p : b.x - a.x;
      });

      onEpisodeClick(candidates[0].episodeId);
    },
    [onEpisodeClick]
  );

  return (
    <div
      css={css`
        height: ${height}px;
        border-top: 1px solid ${euiTheme.colors.lightestShade};
      `}
      data-test-subj="alertTimelineRow"
    >
      <Chart size={{ height }}>
        <Settings
          showLegend={false}
          baseTheme={baseTheme}
          locale={i18n.getLocale()}
          xDomain={{ min: gteMs, max: lteMs }}
          onAnnotationClick={onEpisodeClick ? handleAnnotationClick : undefined}
          onElementClick={onEpisodeClick ? handleElementClick : undefined}
          theme={{
            chartMargins: { top: 0, right: 0, bottom: 0, left: 0 },
            chartPaddings: { top: 0, right: 0, bottom: 0, left: 0 },
          }}
        />
        <Tooltip
          header="none"
          body={({ items }) => {
            const datum = items?.[0]?.datum as TransitionDatum | undefined;
            if (!datum?.episodeId) return null;
            return (
              <TooltipPanel
                euiTheme={euiTheme}
                status={datum.status}
                episodeId={datum.episodeId}
                primaryLine={i18n.translate(
                  'xpack.alertingV2.alertTimeline.tooltip.transitionTime',
                  {
                    defaultMessage: 'Transitioned at {when}',
                    values: { when: formatTimestamp(datum.x) },
                  }
                )}
              />
            );
          }}
        />
        <Axis id="left" position={Position.Left} hide domain={{ min: 0, max: 1, fit: false }} />
        {STATUS_ORDER.map((status) => {
          const segments = segmentsByStatus[status] ?? [];
          if (segments.length === 0) return null;
          const fill = alertTimelineStatusColor(euiTheme, status);
          return (
            <RectAnnotation
              key={`rect-${status}`}
              id={`alert-timeline-row-${row.groupHash}-rect-${status}`}
              dataValues={
                segments.map((s) => ({
                  coordinates: { x0: s.x0Ms, x1: s.x1Ms, y0: RECT_Y0, y1: RECT_Y1 },
                  details: {
                    kind: 'segment',
                    episodeId: s.episodeId,
                    status: s.status,
                    x0Ms: s.x0Ms,
                    x1Ms: s.x1Ms,
                  },
                })) as unknown as RectAnnotationDatum[]
              }
              style={{ fill, strokeWidth: 0, opacity: 1 }}
              customTooltip={({ details }) => {
                const d = details as SegmentDetails | undefined;
                if (!d) return null;
                return (
                  <TooltipPanel
                    euiTheme={euiTheme}
                    status={d.status}
                    episodeId={d.episodeId}
                    primaryLine={i18n.translate('xpack.alertingV2.alertTimeline.tooltip.from', {
                      defaultMessage: 'From: {when}',
                      values: { when: formatTimestamp(d.x0Ms) },
                    })}
                    secondaryLine={i18n.translate('xpack.alertingV2.alertTimeline.tooltip.to', {
                      defaultMessage: 'To: {when}',
                      values: { when: formatTimestamp(d.x1Ms) },
                    })}
                    durationLabel={i18n.translate(
                      'xpack.alertingV2.alertTimeline.tooltip.duration',
                      {
                        defaultMessage: 'Duration: {duration}',
                        values: { duration: formatDuration(d.x1Ms - d.x0Ms) },
                      }
                    )}
                  />
                );
              }}
            />
          );
        })}
        <LineSeries
          id={`alert-timeline-row-${row.groupHash}-anchor`}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={[
            { x: gteMs, y: 0 },
            { x: lteMs, y: 1 },
          ]}
          hideInLegend
          filterSeriesInTooltip={() => false}
          lineSeriesStyle={{
            line: { visible: false, opacity: 0 },
            point: { visible: 'never' },
          }}
        />
        {sortedTransitions.length > 0 && (
          <LineSeries
            id={`alert-timeline-row-${row.groupHash}-dots`}
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            data={sortedTransitions.map<TransitionDatum>((t) => ({
              x: t.tsMs,
              y: 0.5,
              episodeId: t.episodeId,
              status: t.status,
              href: getEpisodeHref?.(t.episodeId),
            }))}
            hideInLegend
            lineSeriesStyle={{
              line: { visible: false, opacity: 0 },
              point: {
                visible: 'always',
                radius: 3,
                fill: euiTheme.colors.emptyShade,
                strokeWidth: 2,
              },
            }}
            pointStyleAccessor={(datum) => {
              const d = datum.datum as TransitionDatum;
              return { stroke: alertTimelineStatusColor(euiTheme, d.status) };
            }}
          />
        )}
      </Chart>
    </div>
  );
};

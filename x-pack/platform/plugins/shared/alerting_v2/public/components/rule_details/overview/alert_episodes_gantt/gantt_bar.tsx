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
import { EuiText, useEuiTheme } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { PluginStart } from '@kbn/core-di';
import { useService } from '@kbn/core-di-browser';
import type {
  GanttSegment,
  GanttSeries,
  GanttTransition,
} from '../../../../utils/derive_gantt_data';
import { ganttStatusColor, ganttStatusLabel } from './gantt_status_palette';
import { formatDuration, formatTimestamp } from './gantt_format';

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

// Rect annotations span a centered horizontal band, not the full lane height,
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
  // Populated when getEpisodeHref is provided so the click handler can
  // navigate without re-resolving the URL or filtering by series id.
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
    <div
      css={css`
        background: ${euiTheme.colors.emptyShade};
        border: 1px solid ${euiTheme.colors.lightShade};
        border-radius: ${euiTheme.border.radius.small};
        max-width: 280px;
      `}
    >
      <EuiText size="xs">
        <div
          css={css`
            display: flex;
            align-items: center;
            gap: ${euiTheme.size.xs};
            padding: ${euiTheme.size.xs} ${euiTheme.size.s};
            border-bottom: 1px solid ${euiTheme.colors.lightShade};
          `}
        >
          <span
            css={css`
              display: inline-block;
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: ${ganttStatusColor(euiTheme, status)};
            `}
          />
          <strong>{ganttStatusLabel(status)}</strong>
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
            {i18n.translate('xpack.alertingV2.ruleDetails.gantt.tooltip.episodeId', {
              defaultMessage: 'Episode id: {id}',
              values: { id: episodeId },
            })}
          </div>
        </div>
      </EuiText>
    </div>
  );
};

export interface GanttLaneProps {
  lane: GanttSeries;
  gteMs: number;
  lteMs: number;
  height: number;
  onSegmentClick?: (episodeId: string) => void;
  getEpisodeHref?: (episodeId: string) => string;
}

/**
 * One series rendered as a thin elastic-charts lane: rect annotations color
 * each state segment between consecutive events. A hidden line series
 * anchors the chart's domain since rect annotations alone don't establish
 * one.
 */
export const GanttLane: React.FC<GanttLaneProps> = ({
  lane,
  gteMs,
  lteMs,
  height,
  onSegmentClick,
  getEpisodeHref,
}) => {
  const { euiTheme } = useEuiTheme();
  const charts = useService(PluginStart('charts')) as ChartsPluginStart;
  const baseTheme = charts.theme.useChartsBaseTheme();

  const segmentsByStatus = useMemo(
    () => groupBy<GanttSegment, AlertEpisodeStatus>(lane.segments, (s) => s.status),
    [lane.segments]
  );

  const transitionsByStatus = useMemo(
    () => groupBy<GanttTransition, AlertEpisodeStatus>(lane.transitions, (t) => t.status),
    [lane.transitions]
  );

  const handleAnnotationClick = useCallback(
    (annotations: { rects: Array<{ datum: RectAnnotationDatum }> }) => {
      const datum = annotations.rects[0]?.datum;
      const details = datum?.details as SegmentDetails | undefined;
      if (details?.episodeId && onSegmentClick) {
        onSegmentClick(details.episodeId);
      }
    },
    [onSegmentClick]
  );

  // Transition dots open episode details in a new tab. The href is baked
  // into each TransitionDatum at build time, so the hidden anchor series
  // (whose datum has no href) is naturally ignored.
  const handleElementClick = useCallback<ElementClickListener>((elements) => {
    const first = elements[0];
    if (!Array.isArray(first)) return;
    const [geometry] = first as XYChartElementEvent;
    const datum = geometry?.datum as TransitionDatum | undefined;
    if (datum?.href) {
      window.open(datum.href, '_blank', 'noopener,noreferrer');
    }
  }, []);

  return (
    <div
      css={css`
        height: ${height}px;
      `}
      data-test-subj="ganttLane"
    >
      <Chart size={{ height }}>
        <Settings
          showLegend={false}
          baseTheme={baseTheme}
          locale={i18n.getLocale()}
          xDomain={{ min: gteMs, max: lteMs }}
          onAnnotationClick={onSegmentClick ? handleAnnotationClick : undefined}
          onElementClick={getEpisodeHref ? handleElementClick : undefined}
          theme={{
            chartMargins: { top: 0, right: 0, bottom: 0, left: 0 },
            chartPaddings: { top: 0, right: 0, bottom: 0, left: 0 },
          }}
        />
        {/* Tooltip for transition dots — series tooltips are driven by the
            chart-level <Tooltip>, while rect annotations have their own
            customTooltip below. */}
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
                  'xpack.alertingV2.ruleDetails.gantt.tooltip.transitionTime',
                  {
                    defaultMessage: 'Transitioned at {when}',
                    values: { when: formatTimestamp(datum.x) },
                  }
                )}
              />
            );
          }}
        />
        {/* Hidden left axis with an explicit fixed domain so every lane
            renders rect annotations at the exact same pixel height. Without
            it elastic-charts auto-fits per-chart and heights drift. */}
        <Axis id="left" position={Position.Left} hide domain={{ min: 0, max: 1, fit: false }} />
        {STATUS_ORDER.map((status) => {
          const segments = segmentsByStatus[status] ?? [];
          if (segments.length === 0) return null;
          const fill = ganttStatusColor(euiTheme, status);
          return (
            <RectAnnotation
              key={`rect-${status}`}
              id={`gantt-lane-${lane.groupHash}-rect-${status}`}
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
                    primaryLine={i18n.translate('xpack.alertingV2.ruleDetails.gantt.tooltip.from', {
                      defaultMessage: 'From: {when}',
                      values: { when: formatTimestamp(d.x0Ms) },
                    })}
                    secondaryLine={i18n.translate('xpack.alertingV2.ruleDetails.gantt.tooltip.to', {
                      defaultMessage: 'To: {when}',
                      values: { when: formatTimestamp(d.x1Ms) },
                    })}
                    durationLabel={i18n.translate(
                      'xpack.alertingV2.ruleDetails.gantt.tooltip.duration',
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
          id={`gantt-lane-${lane.groupHash}-anchor`}
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={[
            { x: gteMs, y: 0 },
            { x: lteMs, y: 1 },
          ]}
          color="rgba(0,0,0,0)"
          hideInLegend
          filterSeriesInTooltip={() => false}
          lineSeriesStyle={{
            line: { visible: false, opacity: 0 },
            point: { visible: 'never' },
          }}
        />
        {/* One LineSeries per status carrying that status's transition
            timestamps. The connecting line is hidden and only the points
            render — guarantees a fixed-radius dot at every state change
            even when the time window is wide and rect annotations would
            otherwise compress to sub-pixel widths. */}
        {STATUS_ORDER.map((status) => {
          const transitions = transitionsByStatus[status] ?? [];
          if (transitions.length === 0) return null;
          const color = ganttStatusColor(euiTheme, status);
          return (
            <LineSeries
              key={`dots-${status}`}
              id={`gantt-lane-${lane.groupHash}-dots-${status}`}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              data={transitions.map<TransitionDatum>((t) => ({
                x: t.tsMs,
                y: 0.5,
                episodeId: t.episodeId,
                status: t.status,
                href: getEpisodeHref?.(t.episodeId),
              }))}
              color={color}
              hideInLegend
              lineSeriesStyle={{
                line: { visible: false, opacity: 0 },
                point: {
                  visible: 'always',
                  radius: 3,
                  fill: euiTheme.colors.emptyShade,
                  stroke: color,
                  strokeWidth: 2,
                },
              }}
            />
          );
        })}
      </Chart>
    </div>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
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
import type { ElementClickListener, Theme, XYChartElementEvent } from '@elastic/charts';
import { EuiHealth, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EpisodeSeverityTimelineSegment } from './derive_episode_severity_timeline_data';
import { formatTimestamp } from './alert_timeline_format';
import {
  getEpisodeSeverityColor,
  getEpisodeSeverityLabel,
} from '../components/severity/severity_utils';
import { SeverityHeatmapHoverSummary } from '../components/details/severity_heatmap_hover_summary';

const RECT_Y0 = 0.375;
const RECT_Y1 = 0.625;
const TRANSITION_POINT_RADIUS_PX = 4.5;
const TRANSITION_POINT_STROKE_WIDTH_PX = 2;
const CHART_HORIZONTAL_PADDING_PX =
  TRANSITION_POINT_RADIUS_PX + TRANSITION_POINT_STROKE_WIDTH_PX / 2;

interface SeverityTransitionDatum {
  x: number;
  y: number;
  severity: EpisodeSeverityTimelineSegment['severity'];
  segment: EpisodeSeverityTimelineSegment;
}

interface SeveritySegmentDetails extends EpisodeSeverityTimelineSegment {
  kind: 'severitySegment';
}

export interface EpisodeSeverityTimelineRowProps {
  segments: EpisodeSeverityTimelineSegment[];
  windowStartMs: number;
  windowEndMs: number;
  height: number;
  baseTheme: Theme;
  timeZone?: string;
  onTransitionClick?: (segment: EpisodeSeverityTimelineSegment) => void;
}

export const EpisodeSeverityTimelineRow = ({
  segments,
  windowStartMs,
  windowEndMs,
  height,
  baseTheme,
  timeZone,
  onTransitionClick,
}: EpisodeSeverityTimelineRowProps) => {
  const { euiTheme } = useEuiTheme();
  const handleElementClick = useCallback<ElementClickListener>(
    (elements) => {
      const transition = elements
        .filter((element): element is XYChartElementEvent => Array.isArray(element))
        .map(([geometry]) => geometry.datum as SeverityTransitionDatum | undefined)
        .find((datum) => datum?.segment != null);

      if (transition) {
        onTransitionClick?.(transition.segment);
      }
    },
    [onTransitionClick]
  );

  return (
    <div
      css={css`
        height: ${height}px;
        box-shadow: inset 0 1px ${euiTheme.colors.lightestShade};
      `}
      data-test-subj="episodeSeverityTimelineRow"
    >
      <Chart size={{ height }}>
        <Settings
          showLegend={false}
          baseTheme={baseTheme}
          locale={i18n.getLocale()}
          xDomain={{ min: windowStartMs, max: windowEndMs }}
          onElementClick={onTransitionClick ? handleElementClick : undefined}
          theme={{
            chartMargins: { top: 0, right: 0, bottom: 0, left: 0 },
            chartPaddings: {
              top: 0,
              right: CHART_HORIZONTAL_PADDING_PX,
              bottom: 0,
              left: CHART_HORIZONTAL_PADDING_PX,
            },
          }}
        />
        <Tooltip
          header="none"
          body={({ items }) => {
            const transition = items?.[0]?.datum as SeverityTransitionDatum | undefined;
            if (!transition?.segment) {
              return null;
            }

            return (
              <SeverityHeatmapHoverSummary
                severityLabel={getEpisodeSeverityLabel(transition.severity)}
                timestamp={formatTimestamp(transition.x, timeZone)}
              />
            );
          }}
        />
        <Axis id="left" position={Position.Left} hide domain={{ min: 0, max: 1, fit: false }} />
        {segments.map((segment, index) => (
          <RectAnnotation
            key={`${segment.x0Ms}-${segment.severity}`}
            id={`episode-severity-timeline-${index}`}
            dataValues={[
              {
                coordinates: {
                  x0: segment.x0Ms,
                  x1: segment.x1Ms,
                  y0: RECT_Y0,
                  y1: RECT_Y1,
                },
                details: { kind: 'severitySegment', ...segment } as unknown as string,
              },
            ]}
            style={{
              fill: getEpisodeSeverityColor(euiTheme, segment.severity),
              strokeWidth: 0,
              opacity: 1,
            }}
            customTooltip={({ details }) => {
              const severitySegment = details as SeveritySegmentDetails | undefined;
              if (!severitySegment) {
                return null;
              }

              return (
                <EuiPanel paddingSize="s" hasShadow={false} color="plain">
                  <EuiText size="xs">
                    <EuiHealth
                      color={getEpisodeSeverityColor(euiTheme, severitySegment.severity)}
                      textSize="xs"
                    >
                      <strong>{getEpisodeSeverityLabel(severitySegment.severity)}</strong>
                    </EuiHealth>
                    <div>{formatTimestamp(severitySegment.x0Ms, timeZone)}</div>
                  </EuiText>
                </EuiPanel>
              );
            }}
          />
        ))}
        <LineSeries
          id="episode-severity-timeline-anchor"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={[
            { x: windowStartMs, y: 0 },
            { x: windowEndMs, y: 1 },
          ]}
          hideInLegend
          filterSeriesInTooltip={() => false}
          lineSeriesStyle={{
            line: { visible: false, opacity: 0 },
            point: { visible: 'never' },
          }}
        />
        {segments.length > 0 && (
          <LineSeries
            id="episode-severity-timeline-dots"
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={['y']}
            data={segments.map<SeverityTransitionDatum>((segment) => ({
              x: segment.x0Ms,
              y: 0.5,
              severity: segment.severity,
              segment,
            }))}
            hideInLegend
            lineSeriesStyle={{
              line: { visible: false, opacity: 0 },
              point: {
                visible: 'always',
                radius: TRANSITION_POINT_RADIUS_PX,
                fill: euiTheme.colors.emptyShade,
                strokeWidth: TRANSITION_POINT_STROKE_WIDTH_PX,
              },
            }}
            pointStyleAccessor={(datum) => {
              const severityTransition = datum.datum as SeverityTransitionDatum;
              return {
                stroke: getEpisodeSeverityColor(euiTheme, severityTransition.severity),
              };
            }}
          />
        )}
      </Chart>
    </div>
  );
};

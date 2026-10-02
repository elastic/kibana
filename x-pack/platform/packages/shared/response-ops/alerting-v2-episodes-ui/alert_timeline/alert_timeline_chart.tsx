/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Theme } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AlertTimelineSeries } from './types';
import { AlertTimelineRow } from './alert_timeline_row';
import { AlertTimelineTimeAxis } from './alert_timeline_time_axis';

const META_COLUMN_WIDTH_PX = 180;
const ROW_HEIGHT_PX = 44;
const ALERT_TIMELINE_VISIBLE_ROW_COUNT = 6;

export interface AlertTimelineChartProps {
  rows: AlertTimelineSeries[];
  windowStartMs: number;
  windowEndMs: number;
  baseTheme: Theme;
  timeZone?: string;
  renderSeriesLabel?: (row: AlertTimelineSeries) => React.ReactNode;
  onEpisodeClick?: (episodeId: string) => void;
  getEpisodeHref?: (episodeId: string) => string;
}

export const AlertTimelineChart = ({
  rows,
  windowStartMs,
  windowEndMs,
  baseTheme,
  timeZone,
  renderSeriesLabel,
  onEpisodeClick,
  getEpisodeHref,
}: AlertTimelineChartProps) => {
  const { euiTheme } = useEuiTheme();
  const hasLabelColumn = renderSeriesLabel !== undefined;

  return (
    <div
      aria-label={i18n.translate('xpack.alertingV2.alertTimeline.chart.ariaLabel', {
        defaultMessage: 'Alert activity timeline chart',
      })}
      data-test-subj="alertTimelineChart"
    >
      <div
        css={css`
          max-height: ${ROW_HEIGHT_PX * ALERT_TIMELINE_VISIBLE_ROW_COUNT}px;
          overflow-y: auto;
        `}
      >
        <EuiFlexGroup direction="row" gutterSize="s" responsive={false} alignItems="stretch">
          {renderSeriesLabel && (
            <EuiFlexItem
              grow={false}
              css={css`
                width: ${META_COLUMN_WIDTH_PX}px;
                min-width: 0;
                overflow: hidden;
              `}
            >
              <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
                {rows.map((row) => (
                  <EuiFlexItem grow={false} key={row.groupHash}>
                    <EuiFlexGroup
                      alignItems="center"
                      gutterSize="none"
                      responsive={false}
                      css={css`
                        height: ${ROW_HEIGHT_PX}px;
                      `}
                    >
                      <EuiFlexItem
                        grow={false}
                        css={css`
                          min-width: 0;
                        `}
                      >
                        {renderSeriesLabel(row)}
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}

          <EuiFlexItem>
            {rows.map((row) => (
              <AlertTimelineRow
                key={row.groupHash}
                row={row}
                windowStartMs={windowStartMs}
                windowEndMs={windowEndMs}
                height={ROW_HEIGHT_PX}
                baseTheme={baseTheme}
                timeZone={timeZone}
                onEpisodeClick={onEpisodeClick}
                getEpisodeHref={getEpisodeHref}
              />
            ))}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>

      <div
        css={css`
          display: flex;
          gap: ${hasLabelColumn ? euiTheme.size.s : 0};
        `}
      >
        {hasLabelColumn && (
          <div
            css={css`
              width: ${META_COLUMN_WIDTH_PX}px;
              flex-shrink: 0;
            `}
          />
        )}
        <div
          css={css`
            flex: 1;
            min-width: 0;
          `}
        >
          <AlertTimelineTimeAxis
            windowStartMs={windowStartMs}
            windowEndMs={windowEndMs}
            timeZone={timeZone}
          />
        </div>
      </div>
    </div>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { IBasePath } from '@kbn/core-http-browser';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { PluginStart } from '@kbn/core-di';
import { useService } from '@kbn/core-di-browser';
import type { AlertTimelineSeries } from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import { AlertTimelineRow } from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import { AlertTimelineSeriesLabel } from './alert_timeline_series_label';
import { AlertTimelineTimeAxis } from './alert_timeline_time_axis';

const META_COLUMN_WIDTH_PX = 240;
const ROW_HEIGHT_PX = 36;

export interface AlertTimelineChartProps {
  rows: AlertTimelineSeries[];
  gteMs: number;
  lteMs: number;
  ruleId: string;
  basePath: IBasePath;
  timeZone?: string;
  onEpisodeClick?: (episodeId: string) => void;
  getEpisodeHref?: (episodeId: string) => string;
}

export const AlertTimelineChart: React.FC<AlertTimelineChartProps> = ({
  rows,
  gteMs,
  lteMs,
  ruleId,
  basePath,
  timeZone,
  onEpisodeClick,
  getEpisodeHref,
}) => {
  const { euiTheme } = useEuiTheme();
  const charts = useService(PluginStart('charts')) as ChartsPluginStart;
  const baseTheme = charts.theme.useChartsBaseTheme();

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="m"
      responsive={false}
      alignItems="stretch"
      aria-label={i18n.translate('xpack.alertingV2.alertTimeline.chart.ariaLabel', {
        defaultMessage: 'Alert activity timeline chart',
      })}
      data-test-subj="alertTimelineChart"
    >
      <EuiFlexItem
        grow={false}
        css={css`
          width: ${META_COLUMN_WIDTH_PX}px;
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>
            <div
              css={css`
                height: ${euiTheme.size.l};
              `}
            />
          </EuiFlexItem>
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
                <EuiFlexItem>
                  <AlertTimelineSeriesLabel
                    groupHash={row.groupHash}
                    groupingValues={row.groupingValues}
                    episodeCount={row.episodeCount}
                    ruleId={ruleId}
                    gteMs={gteMs}
                    lteMs={lteMs}
                    basePath={basePath}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <AlertTimelineTimeAxis gteMs={gteMs} lteMs={lteMs} timeZone={timeZone} />
        {rows.map((row) => (
          <AlertTimelineRow
            key={row.groupHash}
            row={row}
            gteMs={gteMs}
            lteMs={lteMs}
            height={ROW_HEIGHT_PX}
            baseTheme={baseTheme}
            timeZone={timeZone}
            onEpisodeClick={onEpisodeClick}
            getEpisodeHref={getEpisodeHref}
          />
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

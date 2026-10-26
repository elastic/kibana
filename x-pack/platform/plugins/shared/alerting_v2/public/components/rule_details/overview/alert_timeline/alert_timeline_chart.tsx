/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { PluginStart } from '@kbn/core-di';
import { useService } from '@kbn/core-di-browser';
import type { AlertTimelineSeries } from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import { AlertTimelineChart as SharedAlertTimelineChart } from '@kbn/alerting-v2-episodes-ui/alert_timeline';
import { AlertTimelineSeriesLabel } from './alert_timeline_series_label';

export interface AlertTimelineChartProps {
  rows: AlertTimelineSeries[];
  windowStartMs: number;
  windowEndMs: number;
  timeZone?: string;
  /** Render the per-series label column. Omitted for ungrouped rules, whose hashes carry no useful label. */
  showLabelColumn: boolean;
  onEpisodeClick?: (episodeId: string) => void;
  getEpisodeHref?: (episodeId: string) => string;
}

export const AlertTimelineChart: React.FC<AlertTimelineChartProps> = ({
  rows,
  windowStartMs,
  windowEndMs,
  timeZone,
  showLabelColumn,
  onEpisodeClick,
  getEpisodeHref,
}) => {
  const charts = useService(PluginStart('charts')) as ChartsPluginStart;
  const baseTheme = charts.theme.useChartsBaseTheme();
  const renderSeriesLabel = useCallback(
    (row: AlertTimelineSeries) => (
      <AlertTimelineSeriesLabel
        groupHash={row.groupHash}
        groupingValues={row.groupingValues}
        episodeCount={row.episodeCount}
      />
    ),
    []
  );

  return (
    <SharedAlertTimelineChart
      rows={rows}
      windowStartMs={windowStartMs}
      windowEndMs={windowEndMs}
      baseTheme={baseTheme}
      timeZone={timeZone}
      renderSeriesLabel={showLabelColumn ? renderSeriesLabel : undefined}
      onEpisodeClick={onEpisodeClick}
      getEpisodeHref={getEpisodeHref}
    />
  );
};

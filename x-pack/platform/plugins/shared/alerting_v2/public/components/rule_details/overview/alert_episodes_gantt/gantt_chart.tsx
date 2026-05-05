/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { IBasePath } from '@kbn/core-http-browser';
import type { GanttSeries } from '../../../../utils/derive_gantt_data';
import { GanttRow } from './gantt_row';
import { GanttSeriesLabel } from './gantt_series_label';
import { GanttTimeAxis } from './gantt_time_axis';

const META_COLUMN_WIDTH_PX = 240;
const ROW_HEIGHT_PX = 36;

export interface GanttChartProps {
  rows: GanttSeries[];
  gteMs: number;
  lteMs: number;
  ruleId: string;
  basePath: IBasePath;
  onEpisodeClick?: (episodeId: string) => void;
  getEpisodeHref?: (episodeId: string) => string;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  rows,
  gteMs,
  lteMs,
  ruleId,
  basePath,
  onEpisodeClick,
  getEpisodeHref,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="m"
      responsive={false}
      alignItems="stretch"
      data-test-subj="ganttChart"
    >
      <EuiFlexItem grow={false} style={{ width: META_COLUMN_WIDTH_PX }}>
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          {/* Spacer to align with the time axis above the bar tracks */}
          <EuiFlexItem grow={false}>
            <div
              css={css`
                height: ${euiTheme.size.l};
              `}
            />
          </EuiFlexItem>
          {rows.map((row) => (
            <EuiFlexItem grow={false} key={row.groupHash}>
              <div
                css={css`
                  height: ${ROW_HEIGHT_PX}px;
                  display: flex;
                  align-items: center;
                `}
              >
                <GanttSeriesLabel
                  groupHash={row.groupHash}
                  groupingValues={row.groupingValues}
                  episodeCount={row.episodeCount}
                  ruleId={ruleId}
                  gteMs={gteMs}
                  lteMs={lteMs}
                  basePath={basePath}
                />
              </div>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <GanttTimeAxis gteMs={gteMs} lteMs={lteMs} />
        {rows.map((row) => (
          <GanttRow
            key={row.groupHash}
            row={row}
            gteMs={gteMs}
            lteMs={lteMs}
            height={ROW_HEIGHT_PX}
            onSegmentClick={onEpisodeClick}
            getEpisodeHref={getEpisodeHref}
          />
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { GanttEpisode, GanttSeries } from '../../../../utils/derive_gantt_data';
import { GanttBar } from './gantt_bar';
import { GanttSeriesLabel } from './gantt_series_label';
import { GanttTimeAxis } from './gantt_time_axis';

const META_COLUMN_WIDTH_PX = 240;
const ROW_HEIGHT_PX = 28;

export interface GanttChartProps {
  rows: GanttSeries[];
  gteMs: number;
  lteMs: number;
  onEpisodeClick?: (episode: GanttEpisode) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({ rows, gteMs, lteMs, onEpisodeClick }) => {
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
                <GanttSeriesLabel groupHash={row.groupHash} groupingValues={row.groupingValues} />
              </div>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <GanttTimeAxis gteMs={gteMs} lteMs={lteMs} />
        {rows.map((row) => (
          <div
            key={row.groupHash}
            css={css`
              position: relative;
              height: ${ROW_HEIGHT_PX}px;
              border-top: 1px solid ${euiTheme.colors.lightestShade};
            `}
            data-test-subj="ganttRow"
          >
            {row.episodes.map((ep) => (
              <GanttBar
                key={ep.episodeId}
                episode={ep}
                gteMs={gteMs}
                lteMs={lteMs}
                onClick={onEpisodeClick}
              />
            ))}
          </div>
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

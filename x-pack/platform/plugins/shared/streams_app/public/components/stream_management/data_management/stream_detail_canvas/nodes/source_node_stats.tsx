/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiHealth, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { formatEventsRate } from '../../../../../services/unit_stats_client/format_stats';
import { useSourceStats } from '../../../../unit_stats/state_management/use_stats_manager';
import { getSourceFlowStatus } from './source_stats_status';
import { StatsProblemIcon } from './stats_problem_icon';

interface SourceNodeStatsProps {
  sourceId: string;
}

/**
 * The footer of a source node: `Live` and the rate of the items it accepts, or `Waiting for
 * data...` when it has none. It is its own component, so a stats update re-renders only this row,
 * and never the node or the graph. It always reserves its row, so the card does not change size
 * when the first result arrives. Until then, and when the stats could not be loaded, it shows no
 * status, so a load or a failure never claims that the source is waiting.
 */
export function SourceNodeStats({ sourceId }: SourceNodeStatsProps) {
  const { euiTheme } = useEuiTheme();
  const entry = useSourceStats(sourceId);
  const status = getSourceFlowStatus(entry);

  return (
    <div
      data-test-subj="streamsCanvasSourceStats"
      css={css`
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: ${euiTheme.size.xs} ${euiTheme.size.s};
        margin-top: ${euiTheme.size.xs};
        min-height: ${euiTheme.size.l};
      `}
    >
      {status === 'live' && (
        <>
          <EuiHealth color="success" textSize="xs" data-test-subj="streamsCanvasSourceLive">
            {i18n.translate('xpack.streams.canvas.sourceNode.liveStatus', {
              defaultMessage: 'Live',
            })}
          </EuiHealth>
          <EuiText size="xs" data-test-subj="streamsCanvasSourceRate">
            {formatEventsRate(entry?.stats?.acceptedRate ?? null)}
          </EuiText>
        </>
      )}
      {status === 'waiting' && (
        <EuiHealth color="subdued" textSize="xs" data-test-subj="streamsCanvasSourceWaiting">
          {i18n.translate('xpack.streams.canvas.sourceNode.waitingStatus', {
            defaultMessage: 'Waiting for data...',
          })}
        </EuiHealth>
      )}
      {entry?.status === 'stale' && status !== 'unknown' && (
        <StatsProblemIcon problem="stale" dataTestSubj="streamsCanvasSourceStale" />
      )}
      {entry?.status === 'error' && entry.error && (
        <StatsProblemIcon
          problem="error"
          reason={entry.error.reason}
          dataTestSubj="streamsCanvasSourceError"
        />
      )}
    </div>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  formatDuration,
  formatEventsRate,
} from '../../../../../services/unit_stats_client/format_stats';
import { useDestinationStats } from '../../../../unit_stats/state_management/use_stats_manager';
import { StatsProblemIcon } from './stats_problem_icon';

interface DestinationNodeStatsProps {
  destinationId: string;
  indexCount?: number;
}

/**
 * The footer of a destination node: the rate and the latency, for example `8.1k/s | 175ms`. A value
 * that is missing shows a dash, so a destination with no data shows `- | -`, and a rate of exactly 0
 * shows `0/s`. It is its own component, so a stats update re-renders only this row, and never the
 * node or the graph. It always reserves its row, so the card does not change size when the first
 * result arrives. Until then, and when the stats could not be loaded, it shows no numbers, so a
 * load or a failure never looks like a measured value.
 */
export function DestinationNodeStats({ destinationId, indexCount }: DestinationNodeStatsProps) {
  const { euiTheme } = useEuiTheme();
  const entry = useDestinationStats(destinationId);
  const hasValues =
    entry?.status === 'ready' || entry?.status === 'noData' || entry?.status === 'stale';

  return (
    <div
      data-test-subj="streamsCanvasDestinationStats"
      css={css`
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: ${euiTheme.size.xs} ${euiTheme.size.s};
        margin-top: ${euiTheme.size.xs};
        min-height: ${euiTheme.size.l};
      `}
    >
      {hasValues && (
        <>
          <EuiText size="xs" data-test-subj="streamsCanvasDestinationRate">
            {formatEventsRate(entry.stats?.eventsRate ?? null)}
          </EuiText>
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj="streamsCanvasDestinationLatency"
            // The border divides the rate and the latency, so no separator character is needed.
            css={css`
              padding-inline-start: ${euiTheme.size.s};
              border-inline-start: ${euiTheme.border.width.thin} solid
                ${euiTheme.colors.borderBaseSubdued};
            `}
          >
            {formatDuration(entry.stats?.latencyAverage ?? null)}
          </EuiText>
        </>
      )}
      {entry?.status === 'stale' && (
        <StatsProblemIcon problem="stale" dataTestSubj="streamsCanvasDestinationStale" />
      )}
      {entry?.status === 'error' && entry.error && (
        <StatsProblemIcon
          problem="error"
          reason={entry.error.reason}
          dataTestSubj="streamsCanvasDestinationError"
        />
      )}
      {typeof indexCount === 'number' && indexCount > 0 && (
        <EuiText
          size="xs"
          color="subdued"
          data-test-subj="streamsCanvasDestinationIndexCount"
          // Pushed to the right edge, so the rate and latency sit on the left and the row uses the width.
          css={css`
            margin-left: auto;
          `}
        >
          {i18n.translate('xpack.streams.canvas.destinationNode.indexCount', {
            defaultMessage: '{indexCount, plural, one {# index} other {# indices}}',
            values: { indexCount },
          })}
        </EuiText>
      )}
    </div>
  );
}

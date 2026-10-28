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
import { useDestinationStats } from '../../../../unit_stats/state_management/use_stats_manager';
import { getDestinationFlowStatus } from './destination_stats_status';

interface DestinationNodeStatsProps {
  destinationId: string;
  indexCount?: number;
}

/**
 * The footer of a destination node. It is its own component, so a stats update re-renders only
 * this row, and never the node or the graph. It always reserves its row, so the card does not
 * change size when the first result arrives.
 */
export function DestinationNodeStats({ destinationId, indexCount }: DestinationNodeStatsProps) {
  const { euiTheme } = useEuiTheme();
  const entry = useDestinationStats(destinationId);
  const status = getDestinationFlowStatus(entry);

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
      {status === 'live' && (
        <>
          <EuiHealth color="success" textSize="xs" data-test-subj="streamsCanvasDestinationLive">
            {i18n.translate('xpack.streams.canvas.destinationNode.liveStatus', {
              defaultMessage: 'Live',
            })}
          </EuiHealth>
          <EuiText size="xs" data-test-subj="streamsCanvasDestinationRate">
            {formatEventsRate(entry?.stats?.eventsRate ?? null)}
          </EuiText>
        </>
      )}
      {status === 'notFlowing' && (
        <EuiHealth
          color="subdued"
          textSize="xs"
          data-test-subj="streamsCanvasDestinationNotFlowing"
        >
          {i18n.translate('xpack.streams.canvas.destinationNode.notFlowingStatus', {
            defaultMessage: 'Data not flowing in',
          })}
        </EuiHealth>
      )}
      {typeof indexCount === 'number' && indexCount > 0 && (
        <EuiText
          size="xs"
          color="subdued"
          data-test-subj="streamsCanvasDestinationIndexCount"
          // Pushed to the right edge, so the status and rate sit on the left and the row uses the width.
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

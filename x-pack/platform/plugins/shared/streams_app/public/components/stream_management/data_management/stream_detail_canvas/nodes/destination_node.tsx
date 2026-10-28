/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { Position, type NodeProps } from '@xyflow/react';
import { ConnectionHandle } from './connection_handle';
import type { DestinationNode as DestinationNodeType } from '../types';
import { DESTINATION_NODE_WIDTH } from '../canvas_constants';
import { DestinationNodeStats } from './destination_node_stats';
import { DESTINATION_TYPES_WITH_STATS } from './destination_stats_status';
import { getNodeCardStyles } from './node_card_styles';
import { DESTINATION_SIGNAL_LABELS } from '../../../../streams_layout/destinations/destination_type_config';

export function DestinationNode({ data, selected, dragging }: NodeProps<DestinationNodeType>) {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <ConnectionHandle
        type="target"
        position={Position.Left}
        isConnectable={Boolean(data.destinationId)}
        destinationId={data.destinationId}
      />
      <EuiPanel
        // `nokey` stops React Flow from arming a marquee when a Shift+drag starts
        // on the card, so Shift+click multi-select stays stable.
        className="nokey"
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj="streamsCanvasDestinationNode"
        css={getNodeCardStyles(euiTheme, {
          width: DESTINATION_NODE_WIDTH,
          selected,
          dragging,
        })}
      >
        <div
          css={css`
            display: flex;
            align-items: flex-start;
            gap: ${euiTheme.size.s};
          `}
        >
          <div
            css={css`
              flex: 1 1 auto;
              min-width: 0;
              overflow-wrap: anywhere;
            `}
          >
            <div
              css={css`
                display: flex;
                align-items: center;
                gap: ${euiTheme.size.xs};
                flex-wrap: wrap;
              `}
            >
              <EuiText size="m">
                <strong>{data.title}</strong>
              </EuiText>
              {data.signals?.map((signal) => (
                <EuiBadge
                  key={signal}
                  color="hollow"
                  data-test-subj="streamsCanvasDestinationSignalBadge"
                >
                  {DESTINATION_SIGNAL_LABELS[signal]}
                </EuiBadge>
              ))}
            </div>
            {data.subtitle && (
              <EuiText size="s" color="subdued">
                {data.subtitle}
              </EuiText>
            )}
          </div>
        </div>
        {data.destinationId &&
          data.destinationType &&
          DESTINATION_TYPES_WITH_STATS.includes(data.destinationType) && (
            <DestinationNodeStats destinationId={data.destinationId} indexCount={data.indexCount} />
          )}
      </EuiPanel>
    </>
  );
}

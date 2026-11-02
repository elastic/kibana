/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiPanel, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Position, type NodeProps } from '@xyflow/react';
import { ConnectionHandle } from './connection_handle';
import type { DestinationNode as DestinationNodeType } from '../types';
import { DESTINATION_NODE_WIDTH } from '../canvas_constants';
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
              {typeof data.indexCount === 'number' && data.indexCount > 0 && (
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.streams.canvas.destinationNode.indexCountTooltip',
                    {
                      defaultMessage: '{indexCount, plural, one {# index} other {# indices}}',
                      values: { indexCount: data.indexCount },
                    }
                  )}
                  disableScreenReaderOutput
                >
                  <EuiBadge
                    color="hollow"
                    tabIndex={0}
                    data-test-subj="streamsCanvasDestinationIndexCountBadge"
                  >
                    {data.indexCount}
                  </EuiBadge>
                </EuiToolTip>
              )}
            </div>
            {data.subtitle && (
              <EuiText size="s" color="subdued">
                {data.subtitle}
              </EuiText>
            )}
          </div>
        </div>
      </EuiPanel>
    </>
  );
}

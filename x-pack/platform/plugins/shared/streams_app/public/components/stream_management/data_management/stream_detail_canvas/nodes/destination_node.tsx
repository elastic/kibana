/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiPanel, EuiSpacer, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Position, type NodeProps } from '@xyflow/react';
import { ConnectionHandle } from './connection_handle';
import type { DestinationNode as DestinationNodeType } from '../types';
import { DESTINATION_NODE_WIDTH } from '../canvas_constants';
import { getNodeCardStyles } from './node_card_styles';

const processingLabel = i18n.translate('xpack.streams.canvas.destinationNode.processingLabel', {
  defaultMessage: 'Processing',
});

export function DestinationNode({ data, selected, dragging }: NodeProps<DestinationNodeType>) {
  const { euiTheme } = useEuiTheme();
  const isUnconfigured = Boolean(data.unconfiguredNodeId);
  const streamName = data.streamName;

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
        data-test-subj={
          isUnconfigured
            ? 'streamsCanvasUnconfiguredDestinationNode'
            : 'streamsCanvasDestinationNode'
        }
        css={getNodeCardStyles(euiTheme, {
          width: isUnconfigured || data.destinationId ? 220 : DESTINATION_NODE_WIDTH,
          selected,
          dragging,
          danger: isUnconfigured,
        })}
      >
        <div
          css={css`
            display: flex;
            align-items: flex-start;
            gap: ${euiTheme.size.s};
          `}
        >
          <EuiText
            size="xs"
            css={css`
              flex: 1 1 auto;
              min-width: 0;
              overflow-wrap: anywhere;
            `}
          >
            <strong>{data.title}</strong>
            {data.subtitle && (
              <>
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="subdued">
                  {data.subtitle}
                </EuiText>
              </>
            )}
          </EuiText>
          {data.hasProcessing && streamName && (
            <EuiToolTip content={processingLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="processor"
                size="xs"
                color="text"
                aria-label={processingLabel}
                data-test-subj="streamsCanvasProcessingButton"
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  data.onProcessingClick?.(streamName);
                }}
              />
            </EuiToolTip>
          )}
        </div>
        {isUnconfigured && data.configurationLabel && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s" color="danger">
              {data.configurationLabel}
            </EuiText>
          </>
        )}
      </EuiPanel>
    </>
  );
}

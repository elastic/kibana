/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { DestinationNode as DestinationNodeType } from '../types';
import { DESTINATION_NODE_WIDTH } from '../canvas_constants';
import { getNodeCardStyles } from './node_card_styles';

const processingLabel = i18n.translate('xpack.streams.canvas.destinationNode.processingLabel', {
  defaultMessage: 'Processing',
});

export function DestinationNode({ data, selected, dragging }: NodeProps<DestinationNodeType>) {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <EuiPanel
        // `nokey` stops React Flow from arming a marquee when a Shift+drag starts
        // on the card, so Shift+click multi-select stays stable.
        className="nokey"
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj="streamsCanvasDestinationNode"
        css={getNodeCardStyles(euiTheme, { width: DESTINATION_NODE_WIDTH, selected, dragging })}
      >
        <EuiText size="xs">
          <strong>{data.title}</strong>
        </EuiText>
        {data.hasProcessing && (
          <>
            <EuiSpacer size="xs" />
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={processingLabel}>
                  <EuiPanel
                    hasShadow={false}
                    hasBorder
                    paddingSize="none"
                    color="subdued"
                    data-test-subj="streamsCanvasProcessingGlyph"
                    css={css`
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      padding: ${euiTheme.size.xxs};
                    `}
                  >
                    <EuiIcon type="processor" size="s" aria-label={processingLabel} />
                  </EuiPanel>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {processingLabel}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiPanel>
    </>
  );
}

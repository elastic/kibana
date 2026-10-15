/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { Position, type NodeProps } from '@xyflow/react';
import { ConnectionHandle } from './connection_handle';
import type { DataStreamsNode as DataStreamsNodeType } from '../types';
import { DATA_STREAMS_NODE_WIDTH } from '../canvas_constants';
import { getNodeCardStyles } from './node_card_styles';

export function DataStreamsNode({ data, selected, dragging }: NodeProps<DataStreamsNodeType>) {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiPanel
        // `nokey` stops React Flow from arming a marquee when a Shift+drag starts
        // on the card, so Shift+click multi-select stays stable.
        className="nokey"
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj="streamsCanvasDataStreamsNode"
        aria-expanded={data.expanded}
        css={getNodeCardStyles(euiTheme, {
          width: DATA_STREAMS_NODE_WIDTH,
          selected,
          dragging,
        })}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiPanel
              hasShadow={false}
              hasBorder
              paddingSize="none"
              color="subdued"
              css={css`
                display: flex;
                align-items: center;
                justify-content: center;
                padding: ${euiTheme.size.xxs};
              `}
            >
              <EuiIcon type="database" size="s" aria-hidden={true} />
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem
            grow
            css={css`
              overflow: hidden;
            `}
          >
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="m">
                  <strong>{data.title}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" data-test-subj="streamsCanvasDataStreamsCount">
                  {data.count}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiText
              size="s"
              color="subdued"
              css={css`
                overflow-wrap: anywhere;
              `}
            >
              {data.subtitle}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={data.expanded ? 'arrowDown' : 'arrowRight'}
              size="s"
              aria-hidden={true}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <ConnectionHandle type="source" position={Position.Right} isConnectable={false} />
    </>
  );
}

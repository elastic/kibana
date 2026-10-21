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
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Position, type NodeProps } from '@xyflow/react';
import { ConnectionHandle } from './connection_handle';
import type { RoutingNode as RoutingNodeType, RoutingNodeRule } from '../types';
import { ROUTING_NODE_WIDTH } from '../canvas_constants';
import { getNodeCardStyles } from './node_card_styles';

const copyLabel = i18n.translate('xpack.streams.canvas.routingNode.copyBadgeLabel', {
  defaultMessage: 'Copy',
});

function RoutingRuleRow({ rule }: { rule: RoutingNodeRule }) {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      data-test-subj="streamsCanvasRoutingNodeRule"
      // Stretch the row to the card edge so the rule's handle sits on the border.
      css={css`
        position: relative;
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
        margin-right: -${euiTheme.size.m};
        padding-right: ${euiTheme.size.m};
        min-height: ${euiTheme.size.l};
      `}
    >
      <EuiToolTip content={rule.label} disableScreenReaderOutput>
        <EuiCode
          transparentBackground={rule.isCatchAll}
          tabIndex={0}
          css={css`
            display: block;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          {rule.handleId}
        </EuiCode>
      </EuiToolTip>
      {rule.action === 'copy' && <EuiBadge color="hollow">{copyLabel}</EuiBadge>}
      <ConnectionHandle
        id={rule.handleId}
        type="source"
        position={Position.Right}
        isConnectable={true}
      />
    </div>
  );
}

export function RoutingNode({ data, selected, dragging }: NodeProps<RoutingNodeType>) {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <ConnectionHandle type="target" position={Position.Left} isConnectable={false} />
      <EuiPanel
        // `nokey` stops React Flow from arming a marquee when a Shift+drag starts
        // on the card, so Shift+click multi-select stays stable.
        className="nokey"
        hasShadow={false}
        hasBorder
        paddingSize="m"
        data-test-subj="streamsCanvasRoutingNode"
        css={getNodeCardStyles(euiTheme, {
          width: ROUTING_NODE_WIDTH,
          selected,
          dragging,
        })}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="branch" size="m" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem
            grow
            css={css`
              overflow: hidden;
            `}
          ></EuiFlexItem>
        </EuiFlexGroup>
        <div
          css={css`
            display: flex;
            flex-direction: column;
            gap: ${euiTheme.size.xs};
            margin-top: ${euiTheme.size.s};
          `}
        >
          {data.rules.map((rule) => (
            <RoutingRuleRow key={rule.handleId} rule={rule} />
          ))}
        </div>
      </EuiPanel>
    </>
  );
}

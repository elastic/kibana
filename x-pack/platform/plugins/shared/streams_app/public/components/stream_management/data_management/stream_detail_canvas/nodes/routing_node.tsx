/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiToolTip,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Position, type NodeProps } from '@xyflow/react';
import { ConnectionHandle } from './connection_handle';
import type { RoutingNode as RoutingNodeType, RoutingNodeRule } from '../types';
import { ROUTING_NODE_WIDTH } from '../canvas_constants';
import { getNodeCardStyles } from './node_card_styles';

const copyLabel = i18n.translate('xpack.streams.canvas.routingNode.copyBadgeLabel', {
  defaultMessage: 'copy',
});

const getRoutingRowStyle = (euiTheme: UseEuiTheme['euiTheme']) => css`
  padding-left: ${euiTheme.size.xs};
  border-top: 2px solid ${euiTheme.border.color};
  &:first-child {
    border-top: 0;
  }
`;

function RoutingRuleRow({ rule }: { rule: RoutingNodeRule }) {
  const { euiTheme } = useEuiTheme();

  const tooltipContent = (
    <EuiText size="m">
      <code>{rule.label}</code>
    </EuiText>
  );

  return (
    <div
      data-test-subj="streamsCanvasRoutingNodeRule"
      // Stretch the row to the card edge so the rule's handle sits on the border.
      css={css`
        position: relative;
        z-index: ${euiTheme.levels.mask};
      `}
    >
      <EuiFlexGroup
        justifyContent="spaceBetween"
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.s} ${euiTheme.size.s};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiToolTip content={tooltipContent} disableScreenReaderOutput>
            <EuiText tabIndex={0}>
              <strong>{rule.handleId}</strong>
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
        {rule.action === 'copy' ? (
          <EuiFlexItem grow={false}>
            <EuiText color="subdued">
              <code>{copyLabel}</code>
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <ConnectionHandle
        id={rule.handleId}
        type="source"
        position={Position.Right}
        isConnectable
        // Each rule keeps one outgoing line. It can be moved, but not added to.
        isConnectableStart={false}
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
        paddingSize="none"
        data-test-subj="streamsCanvasRoutingNode"
        css={getNodeCardStyles(euiTheme, {
          width: ROUTING_NODE_WIDTH,
          selected,
          dragging,
        })}
      >
        <EuiFlexGroup gutterSize="none" alignItems="stretch" responsive={false}>
          <EuiFlexItem
            grow={false}
            css={css`
              padding: ${euiTheme.size.m};
              border-right: 2px solid ${euiTheme.border.color};
            `}
          >
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="branch" size="m" aria-hidden={true} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiFlexGroup gutterSize="none" direction="column">
              {data.rules.map((rule) => (
                <EuiFlexItem css={getRoutingRowStyle(euiTheme)}>
                  <RoutingRuleRow key={rule.handleId} rule={rule} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
}

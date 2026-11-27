/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import type { EntityItem } from '../../../../common/investigations/types';
import { ENTITY_TYPE_ICONS } from '../../icons';
import { CriticalityPill, RiskChip } from './entity_badges';
import { NODE_HEIGHT, NODE_WIDTH } from './scope_helpers';
import * as i18n from './translations';

export interface EntityNodeData extends Record<string, unknown> {
  entity: EntityItem;
}
export type EntityFlowNode = Node<EntityNodeData, 'entity'>;

const hiddenHandle = css`
  opacity: 0;
  pointer-events: none;
`;

export const EntityNode: React.FC<NodeProps<EntityFlowNode>> = ({ data, selected }) => {
  const { euiTheme } = useEuiTheme();
  const { entity } = data;
  const { status } = entity;

  const border =
    status === 'primary'
      ? `2px solid ${euiTheme.colors.primary}`
      : status === 'suspected'
      ? `2px dashed ${euiTheme.colors.warning}`
      : status === 'external'
      ? `1px dotted ${euiTheme.colors.mediumShade}`
      : status === 'dismissed'
      ? `1px dashed ${euiTheme.colors.lightShade}`
      : euiTheme.border.thin;

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow={false}
      hasBorder={false}
      color={status === 'external' ? 'subdued' : 'plain'}
      css={css`
        width: ${NODE_WIDTH}px;
        height: ${NODE_HEIGHT}px;
        border: ${border};
        opacity: ${status === 'dismissed' ? 0.55 : 1};
        outline: ${selected
          ? `${euiTheme.border.width.thick} solid ${euiTheme.colors.primary}`
          : 'none'};
        outline-offset: 2px;
        cursor: grab;
        overflow: hidden;
      `}
      data-test-subj={`investigationScopeNode-${entity.id}`}
      data-status={status}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} css={hiddenHandle} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} css={hiddenHandle} />
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={ENTITY_TYPE_ICONS[entity.entity.type]} size="m" aria-hidden="true" />
            </EuiFlexItem>
            <EuiFlexItem
              css={css`
                min-width: 0;
              `}
            >
              <strong
                title={entity.entity.name}
                css={css`
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                  font-size: ${euiTheme.size.m};
                  font-weight: ${euiTheme.font.weight.semiBold};
                  color: ${euiTheme.colors.textHeading};
                `}
              >
                {entity.entity.name}
              </strong>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <CriticalityPill criticality={entity.entity.criticality} />
            </EuiFlexItem>
            {entity.entity.risk_score !== null && entity.entity.risk_score !== undefined ? (
              <EuiFlexItem grow={false}>
                <RiskChip score={entity.entity.risk_score} />
              </EuiFlexItem>
            ) : null}
            {status === 'suspected' ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">{i18n.STATUS_SUSPECTED_SHORT}</EuiBadge>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
EntityNode.displayName = 'EntityNode';

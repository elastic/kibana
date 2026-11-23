/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiIcon, euiTextTruncate, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import React, { memo } from 'react';
import { kiLabelCapitalizeCss } from '../ki/shared/ki_type_display';
import { getKiGraphNodeIcon } from './ki_graph_node_icon';
import type { KiGraphFlowNode } from './use_ki_graph_layout';
import { KI_GRAPH_NODE_HEIGHT, KI_GRAPH_NODE_WIDTH } from './use_ki_graph_layout';

// Edges run from the node center, so the handles sit there too.
const centeredHandleCss = css`
  top: 50%;
  left: 50%;
  transform: none;
  opacity: 0;
  min-width: 1px;
  min-height: 1px;
  border: 0;
  pointer-events: none;
`;

export const KiGraphNode = memo(({ data }: NodeProps<KiGraphFlowNode>) => {
  const { euiTheme } = useEuiTheme();

  const isEntity = data.kind === 'entity';
  const accentColor = isEntity ? euiTheme.colors.textPrimary : euiTheme.colors.textAccent;
  const restingBorderColor = isEntity
    ? euiTheme.colors.borderBasePrimary
    : euiTheme.colors.borderBaseAccent;

  const shellCss = css({
    boxSizing: 'border-box',
    width: KI_GRAPH_NODE_WIDTH,
    height: KI_GRAPH_NODE_HEIGHT,
    padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: euiTheme.size.xxs,
    background: isEntity
      ? euiTheme.colors.backgroundLightPrimary
      : euiTheme.colors.backgroundLightAccent,
    border: `${data.isSelected ? euiTheme.border.width.thick : euiTheme.border.width.thin} solid ${
      data.isSelected ? accentColor : restingBorderColor
    }`,
    borderRadius: isEntity ? KI_GRAPH_NODE_HEIGHT / 2 : euiTheme.border.radius.medium,
    opacity: data.isDimmed ? 0.3 : 1,
    transition: `opacity ${euiTheme.animation.fast} ease`,
  });

  const titleRowCss = css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
    minWidth: 0,
  });

  const titleCss = css(euiTextTruncate(), {
    flex: 1,
    fontWeight: euiTheme.font.weight.semiBold,
    color: euiTheme.colors.text,
    fontSize: euiTheme.size.base,
  });

  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={false} css={centeredHandleCss} />
      <div css={shellCss} data-test-subj="contextKiGraphNode">
        <div css={titleRowCss}>
          <EuiIcon
            type={getKiGraphNodeIcon(data.kind, data.subtype)}
            color={accentColor}
            aria-hidden={true}
          />
          <span css={titleCss} title={data.title}>
            {data.title}
          </span>
        </div>
        <div css={titleRowCss}>
          <EuiBadge color="hollow" css={kiLabelCapitalizeCss}>
            {data.subtype}
          </EuiBadge>
          {data.occurrences !== undefined ? (
            <EuiBadge color="default">{data.occurrences}</EuiBadge>
          ) : null}
        </div>
      </div>
      <Handle type="source" position={Position.Top} isConnectable={false} css={centeredHandleCss} />
    </>
  );
});

KiGraphNode.displayName = 'KiGraphNode';

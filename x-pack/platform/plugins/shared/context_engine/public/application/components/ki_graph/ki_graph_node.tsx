/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COLOR_MODES_STANDARD,
  EuiIcon,
  euiTextTruncate,
  transparentize,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { Handle, type NodeProps, Position } from '@xyflow/react';
import React, { memo } from 'react';
import { getKiGraphGlyphIconScale, getKiGraphNodeGlyphColors } from './ki_graph_glyph_styles';
import { getKiGraphNodeIcon, isPersonLikeEntitySubtype } from './ki_graph_node_icon';
import {
  KI_GRAPH_NODE_STROKE_WIDTH,
  KI_GRAPH_NODE_STROKE_WIDTH_SELECTED,
  KiGraphNodeShape,
} from './ki_graph_node_shape';
import {
  KI_GRAPH_NODE_ICON_HIDE_BELOW,
  KI_GRAPH_NODE_TINT_MIN_DEGREE,
  KI_GRAPH_NODE_TINT_MIN_OCCURRENCES,
} from './ki_graph_node_size';
import { KI_GRAPH_LABEL_MAX_WIDTH } from './use_visible_label_ids';
import type { KiGraphFlowNode } from './use_ki_graph_layout';

const HOVER_SCALE = 1.15;

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
  const { euiTheme, colorMode } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;
  const { size } = data;
  const labelHalo = euiTheme.colors.backgroundBaseSubdued;

  const isEntity = data.kind === 'entity';

  const isTinted =
    data.degree >= KI_GRAPH_NODE_TINT_MIN_DEGREE ||
    (data.occurrences !== undefined && data.occurrences >= KI_GRAPH_NODE_TINT_MIN_OCCURRENCES);

  const { fill, borderColor, iconColor } = getKiGraphNodeGlyphColors(
    euiTheme,
    data.kind,
    isTinted,
    data.isSelected,
    data.subtype,
    colorMode === COLOR_MODES_STANDARD.dark
  );
  const borderWidth = data.isSelected
    ? KI_GRAPH_NODE_STROKE_WIDTH_SELECTED
    : KI_GRAPH_NODE_STROKE_WIDTH;

  const showIcon =
    size >= KI_GRAPH_NODE_ICON_HIDE_BELOW || (isEntity && isPersonLikeEntitySubtype(data.subtype));
  const iconScale = getKiGraphGlyphIconScale(size);

  const shellScale = data.isHovered ? HOVER_SCALE : 1;

  const shellCss = css({
    position: 'relative',
    boxSizing: 'border-box',
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: data.isDimmed ? 0.3 : 1,
    transform: `scale(${shellScale})`,
    transition: `opacity ${euiTheme.animation.fast} ease, transform ${euiTheme.animation.fast} ease`,
  });

  const iconCss = css({
    position: 'absolute',
    top: '50%',
    left: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    transform: `translate(-50%, -50%) scale(${iconScale})`,
    transformOrigin: 'center',
    pointerEvents: 'none',
  });

  const labelCss = css(euiTextTruncate(`${KI_GRAPH_LABEL_MAX_WIDTH}px`), {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: 2,
    maxWidth: KI_GRAPH_LABEL_MAX_WIDTH,
    fontSize: xsFontSize,
    fontWeight: euiTheme.font.weight.regular,
    lineHeight: euiTheme.font.lineHeightMultiplier,
    color: euiTheme.colors.textParagraph,
    textAlign: 'center',
    pointerEvents: 'none',
    textShadow: `0 0 3px ${labelHalo}, 0 0 3px ${labelHalo}, 1px 0 2px ${labelHalo}, -1px 0 2px ${labelHalo}`,
  });

  const hoverRingStroke = transparentize(euiTheme.colors.primary, 0.5);

  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={false} css={centeredHandleCss} />
      <div
        css={shellCss}
        data-test-subj="contextKiGraphNode"
        aria-label={data.title}
        title={data.title}
      >
        <KiGraphNodeShape
          size={size}
          kind={data.kind}
          fill={fill}
          backdropFill={labelHalo}
          stroke={borderColor}
          strokeWidth={borderWidth}
          isSelected={data.isSelected}
          isHovered={data.isHovered}
          hoverRingStroke={hoverRingStroke}
        />
        {showIcon ? (
          <span css={iconCss}>
            <EuiIcon
              type={getKiGraphNodeIcon(data.kind, data.subtype)}
              color={iconColor}
              size="s"
              aria-hidden
            />
          </span>
        ) : null}
        {data.showLabel ? (
          <span css={labelCss} data-test-subj="contextKiGraphNodeLabel">
            {data.title}
          </span>
        ) : null}
      </div>
      <Handle type="source" position={Position.Top} isConnectable={false} css={centeredHandleCss} />
    </>
  );
});

KiGraphNode.displayName = 'KiGraphNode';

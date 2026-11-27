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
import { Handle, type NodeProps, Position, useStore } from '@xyflow/react';
import React, { memo, useMemo } from 'react';
import { useKiGraphUiStore } from './ki_graph_ui_store';
import { getKiGraphGlyphIconScale, getKiGraphNodeGlyphColors } from './ki_graph_glyph_styles';
import { getKiGraphNodeIcon, isPersonLikeEntitySubtype } from './ki_graph_node_icon';
import {
  KI_GRAPH_NODE_STROKE_WIDTH,
  KI_GRAPH_NODE_STROKE_WIDTH_HOVER,
  KI_GRAPH_NODE_STROKE_WIDTH_SELECTED,
  KiGraphNodeShape,
} from './ki_graph_node_shape';
import {
  KI_GRAPH_NODE_ICON_HIDE_BELOW,
  KI_GRAPH_NODE_TINT_MIN_DEGREE,
  KI_GRAPH_NODE_TINT_MIN_OCCURRENCES,
} from './ki_graph_node_size';
import {
  KI_GRAPH_LABEL_MAX_WIDTH,
  KI_GRAPH_LABEL_MIN_ZOOM,
  KI_GRAPH_LOW_DETAIL_ZOOM,
} from './use_visible_label_ids';
import type { KiGraphFlowNode, KiGraphFlowNodeData } from './use_ki_graph_layout';

const HOVER_SCALE = 1.15;

export type KiGraphRenderableNodeData = KiGraphFlowNodeData & {
  readonly hasNormalLabel: boolean;
  readonly hasHubLabel: boolean;
};

export type KiGraphRenderableFlowNode = KiGraphFlowNode & {
  data: KiGraphRenderableNodeData;
};

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

const shellStaticCss = css({
  position: 'relative',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const lowDetailDotCss = css({
  borderRadius: '50%',
});

const iconStaticCss = css({
  position: 'absolute',
  top: '50%',
  left: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transformOrigin: 'center',
  pointerEvents: 'none',
});

const labelStaticCss = css({
  position: 'absolute',
  top: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  marginTop: 2,
  maxWidth: KI_GRAPH_LABEL_MAX_WIDTH,
  textAlign: 'center',
  pointerEvents: 'none',
});

const getNodeBorderWidth = (isSelected: boolean, isHovered: boolean): number => {
  if (isSelected) {
    return KI_GRAPH_NODE_STROKE_WIDTH_SELECTED;
  }
  if (isHovered) {
    return KI_GRAPH_NODE_STROKE_WIDTH_HOVER;
  }
  return KI_GRAPH_NODE_STROKE_WIDTH;
};

export const KiGraphNode = memo(({ id, data }: NodeProps<KiGraphRenderableFlowNode>) => {
  const { euiTheme, colorMode } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;
  const isSelected = useKiGraphUiStore((state) => state.selectedId === id);
  const isHovered = useKiGraphUiStore((state) => state.hoveredId === id);
  const isHighlighted = useKiGraphUiStore((state) => state.highlightIds?.has(id) ?? false);
  const labelsAboveMinZoom = useStore((state) => state.transform[2] >= KI_GRAPH_LABEL_MIN_ZOOM);
  const isLowDetail = useStore((state) => state.transform[2] < KI_GRAPH_LOW_DETAIL_ZOOM);

  const { size } = data;
  const labelHalo = euiTheme.colors.backgroundBaseSubdued;
  const isForcedLabel = isHighlighted;
  let showLabel = false;
  if (isForcedLabel) {
    showLabel = true;
  } else if (labelsAboveMinZoom) {
    showLabel = data.hasNormalLabel;
  } else {
    showLabel = data.hasHubLabel;
  }

  const isEntity = data.kind === 'entity';

  const isTinted =
    data.degree >= KI_GRAPH_NODE_TINT_MIN_DEGREE ||
    (data.occurrences !== undefined && data.occurrences >= KI_GRAPH_NODE_TINT_MIN_OCCURRENCES);

  const { fill, borderColor, iconColor } = getKiGraphNodeGlyphColors(
    euiTheme,
    data.kind,
    isTinted,
    isSelected,
    data.subtype,
    colorMode === COLOR_MODES_STANDARD.dark
  );
  const borderWidth = getNodeBorderWidth(isSelected, isHovered);

  const isDistinctKindGlyph =
    data.kind === 'memory' ||
    data.kind === 'document' ||
    data.kind === 'workflow' ||
    data.kind === 'crawler';
  const showIcon =
    !isLowDetail &&
    (size >= KI_GRAPH_NODE_ICON_HIDE_BELOW ||
      (isEntity && isPersonLikeEntitySubtype(data.subtype)) ||
      isDistinctKindGlyph);
  const iconScale = getKiGraphGlyphIconScale(size);

  const shellScale = isHovered ? HOVER_SCALE : 1;

  const labelCss = useMemo(
    () =>
      css(labelStaticCss, euiTextTruncate(`${KI_GRAPH_LABEL_MAX_WIDTH}px`), {
        fontSize: xsFontSize,
        fontWeight: euiTheme.font.weight.regular,
        lineHeight: euiTheme.font.lineHeightMultiplier,
        color: euiTheme.colors.textParagraph,
        textShadow: `0 0 3px ${labelHalo}, 0 0 3px ${labelHalo}, 1px 0 2px ${labelHalo}, -1px 0 2px ${labelHalo}`,
      }),
    [
      euiTheme.colors.textParagraph,
      euiTheme.font.lineHeightMultiplier,
      euiTheme.font.weight.regular,
      labelHalo,
      xsFontSize,
    ]
  );

  const hoverRingStroke = transparentize(euiTheme.colors.primary, 0.5);

  const shellStyle = useMemo(
    () => ({
      width: size,
      height: size,
      transform: `scale(${shellScale})`,
      transition: `transform ${euiTheme.animation.fast} ease`,
    }),
    [euiTheme.animation.fast, shellScale, size]
  );

  const iconStyle = useMemo(
    () => ({
      width: size,
      height: size,
      transform: `translate(-50%, -50%) scale(${iconScale})`,
    }),
    [iconScale, size]
  );

  const lowDetailStyle = useMemo(
    () => ({
      width: size,
      height: size,
      backgroundColor: fill,
      border: `${borderWidth}px solid ${borderColor}`,
    }),
    [borderColor, borderWidth, fill, size]
  );

  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={false} css={centeredHandleCss} />
      <div
        css={shellStaticCss}
        style={shellStyle}
        data-ki-graph-node-shell="true"
        {...(isHighlighted ? { 'data-ki-graph-highlighted': 'true' } : {})}
        data-test-subj="contextKiGraphNode"
        aria-label={data.title}
        title={data.title}
      >
        {isLowDetail ? (
          <div css={lowDetailDotCss} style={lowDetailStyle} />
        ) : (
          <KiGraphNodeShape
            size={size}
            kind={data.kind}
            fill={fill}
            backdropFill={labelHalo}
            stroke={borderColor}
            strokeWidth={borderWidth}
            isSelected={isSelected}
            isHovered={isHovered}
            hoverRingStroke={hoverRingStroke}
          />
        )}
        {showIcon ? (
          <span css={iconStaticCss} style={iconStyle}>
            <EuiIcon
              type={getKiGraphNodeIcon(data.kind, data.subtype)}
              color={iconColor}
              size="s"
              aria-hidden
            />
          </span>
        ) : null}
        {showLabel ? (
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

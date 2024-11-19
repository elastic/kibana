/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useEuiBackgroundColor, useEuiTheme } from '@elastic/eui';
import { Handle, Position } from '@xyflow/react';
import {
  NodeShapeContainer,
  NodeLabel,
  NodeShapeOnHoverSvg,
  NodeShapeSvg,
  NodeIcon,
  NodeButton,
  HandleStyleOverride,
} from './styles';
import type { EntityNodeViewModel, NodeProps } from '../types';
import { HexagonHoverShape, HexagonShape } from './shapes/hexagon_shape';
import { NodeExpandButton } from './node_expand_button';

const NODE_WIDTH = 87;
const NODE_HEIGHT = 96;

export const HexagonNode: React.FC<NodeProps> = memo((props: NodeProps) => {
  const { id, color, icon, label, interactive, expandButtonClick, nodeClick } =
    props.data as EntityNodeViewModel;
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <NodeShapeContainer>
        {interactive && (
          <NodeShapeOnHoverSvg
            width={NODE_WIDTH}
            height={NODE_HEIGHT}
            viewBox={`0 0 ${NODE_WIDTH} ${NODE_HEIGHT}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <HexagonHoverShape stroke={euiTheme.colors[color ?? 'primary']} />
          </NodeShapeOnHoverSvg>
        )}
        <NodeShapeSvg
          width="71"
          height="78"
          viewBox="0 0 71 78"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <HexagonShape
            fill={useEuiBackgroundColor(color ?? 'primary')}
            stroke={euiTheme.colors[color ?? 'primary']}
          />
          {icon && <NodeIcon x="11" y="15" icon={icon} color={color} />}
        </NodeShapeSvg>
        {interactive && (
          <>
            <NodeButton onClick={(e) => nodeClick?.(e, props)} />
            <NodeExpandButton
              onClick={(e, unToggleCallback) => expandButtonClick?.(e, props, unToggleCallback)}
              x={`${NODE_WIDTH - NodeExpandButton.ExpandButtonSize / 2 + 2}px`}
              y={`${(NODE_HEIGHT - NodeExpandButton.ExpandButtonSize) / 2 - 2}px`}
            />
          </>
        )}
        <Handle
          type="target"
          isConnectable={false}
          position={Position.Left}
          id="in"
          style={HandleStyleOverride}
        />
        <Handle
          type="source"
          isConnectable={false}
          position={Position.Right}
          id="out"
          style={HandleStyleOverride}
        />
      </NodeShapeContainer>
      <NodeLabel>{Boolean(label) ? label : id}</NodeLabel>
    </>
  );
});

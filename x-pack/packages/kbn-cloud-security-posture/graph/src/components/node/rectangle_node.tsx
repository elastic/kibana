/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiBackgroundColor, useEuiTheme } from '@elastic/eui';
import { Handle, Position } from '@xyflow/react';
import {
  NodeContainer,
  NodeLabel,
  NodeShapeOnHoverSvg,
  NodeShapeSvg,
  NodeIcon,
  NodeButton,
  HandleStyleOverride,
} from './styles';
import { NodeProps } from '.';

export const RectangleNode: React.FC<NodeProps> = (props: NodeProps) => {
  const { id, color, icon, label, interactive, expandButtonClick } = props.data;
  const { euiTheme } = useEuiTheme();
  return (
    <NodeContainer>
      {!interactive || (
        <NodeShapeOnHoverSvg
          width="81"
          height="80"
          viewBox="0 0 81 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            opacity="0.5"
            x="1"
            y="0.5"
            width="79"
            height="79"
            rx="7.5"
            stroke={euiTheme.colors[color ?? 'primary']}
            strokeDasharray="2 2"
          />
        </NodeShapeOnHoverSvg>
      )}
      <NodeShapeSvg
        width="65"
        height="64"
        viewBox="0 0 65 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="1"
          y="0.5"
          width="63"
          height="63"
          rx="7.5"
          fill={useEuiBackgroundColor(color ?? 'primary')}
          stroke={euiTheme.colors[color ?? 'primary']}
        />
        {icon && <NodeIcon x="8" y="7" icon={icon} color={color} />}
      </NodeShapeSvg>
      {!interactive || (
        <NodeButton
          onClick={(e) => expandButtonClick && expandButtonClick(e, props)}
          x={`${81 - NodeButton.ExpandButtonSize / 4}px`}
          y={`${(80 - NodeButton.ExpandButtonSize / 2) / 2}px`}
        />
      )}
      <Handle type="target" position={Position.Left} id="in" style={HandleStyleOverride} />
      <Handle type="source" position={Position.Right} id="out" style={HandleStyleOverride} />
      <NodeLabel>{Boolean(label) ? label : id}</NodeLabel>
    </NodeContainer>
  );
};

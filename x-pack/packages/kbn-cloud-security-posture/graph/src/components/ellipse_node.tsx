/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiBackgroundColor, useEuiTheme } from '@elastic/eui';
import {
  NodeContainer,
  NodeLabel,
  NodeShapeOnHoverSvg,
  NodeShapeSvg,
  NodeIcon,
  NodeButton,
  NodeProps,
} from './shared/node';

export const EllipseNode = (props: NodeProps) => {
  const { id, color, icon, label, interactive, expandButtonClick } = props.data;
  const { euiTheme } = useEuiTheme();
  return (
    <NodeContainer>
      {!interactive || (
        <NodeShapeOnHoverSvg
          width="90"
          height="90"
          viewBox="0 0 90 90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            opacity="0.5"
            cx="45"
            cy="45"
            r="44.5"
            stroke={euiTheme.colors[color ?? 'primary']}
            strokeDasharray="2 2"
          />
        </NodeShapeOnHoverSvg>
      )}
      <NodeShapeSvg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="36"
          cy="36"
          r="35.5"
          fill={useEuiBackgroundColor(color ?? 'primary')}
          stroke={euiTheme.colors[color ?? 'primary']}
        />
        {icon && <NodeIcon x="11" y="12" icon={icon} color={color} />}
      </NodeShapeSvg>
      {!interactive || (
        <NodeButton
          onClick={(e) => expandButtonClick && expandButtonClick(e, props)}
          x={90 - NodeButton.ExpandButtonSize / 2 + 'px'}
          y={(90 - NodeButton.ExpandButtonSize) / 2 + 'px'}
        />
      )}
      <NodeLabel>{Boolean(label) ? label : id}</NodeLabel>
    </NodeContainer>
  );
};

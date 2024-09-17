/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Node, NodeProps as xyNodeProps } from '@xyflow/react';
import styled from '@emotion/styled';
import {
  EuiText,
  EuiIcon,
  type EuiIconProps,
  EuiButtonIcon,
  useEuiBackgroundColor,
} from '@elastic/eui';
import { getSpanIcon } from './get_span_icon';

export const NodeContainer = styled.div`
  position: relative;
  width: 90px;
  height: 90px;
`;

export const NodeShapeSvg = styled.svg`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
`;

export const NodeShapeOnHoverSvg = styled(NodeShapeSvg)`
  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s ease; /* Smooth transition */

  ${NodeContainer}:hover & {
    opacity: 1; /* Show on hover */
  }
`;

interface NodeIconProps {
  icon: string;
  color?: EuiIconProps['color'];
  x: string;
  y: string;
}

export const NodeIcon = ({ icon, color, x, y }: NodeIconProps) => {
  return (
    <foreignObject x={x} y={y} width="50" height="50">
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
      >
        <EuiIcon type={getSpanIcon(icon) ?? icon} size="l" color={color ?? 'primary'} />
      </div>
    </foreignObject>
  );
};

export const NodeLabel = styled(EuiText)`
  position: absolute;
  top: 108%;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

NodeLabel.defaultProps = {
  size: 'xs',
  textAlign: 'center',
};

const ExpandButtonSize = 18;

const RoundEuiButtonIcon = styled(EuiButtonIcon)`
  border-radius: 50%;
  background-color: ${(_props) => useEuiBackgroundColor('plain')};
  width: ${ExpandButtonSize}px;
  height: ${ExpandButtonSize}px;

  > svg {
    transform: translate(0.75px, 0.75px);
  }

  :hover,
  :focus,
  :active {
    background-color: ${(_props) => useEuiBackgroundColor('plain')};
  }
`;

export const StyledNodeButton = styled.div<NodeButtonProps>`
  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s ease; /* Smooth transition */
  ${(props: NodeButtonProps) =>
    (Boolean(props.x) || Boolean(props.y)) &&
    `transform: translate(${props.x ?? '0'}, ${props.y ?? '0'});`}
  position: absolute;
  z-index: 1;

  ${NodeContainer}:hover & {
    opacity: 1; /* Show on hover */
  }
`;

export interface NodeButtonProps {
  x?: string;
  y?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

export const NodeButton = ({ x, y, onClick }: NodeButtonProps) => {
  // State to track whether the icon is "plus" or "minus"
  const [isToggled, setIsToggled] = useState(false);

  const onClickHandler = (e: React.MouseEvent<HTMLElement>) => {
    setIsToggled(!isToggled);
    onClick?.(e);
  };

  return (
    <StyledNodeButton x={x} y={y}>
      <RoundEuiButtonIcon
        color="primary"
        iconType={isToggled ? 'minusInCircleFilled' : 'plusInCircleFilled'}
        onClick={onClickHandler}
        iconSize="m"
      />
    </StyledNodeButton>
  );
};

NodeButton.ExpandButtonSize = ExpandButtonSize;

export interface NodeData extends Record<string, unknown> {
  id: string;
  label?: string;
  color?: 'primary' | 'danger' | 'warning';
  shape: 'hexagon' | 'pentagon' | 'ellipse' | 'rectangle' | 'diamond';
  icon?: string;
  interactive: boolean;
  expandButtonClick?: (e: React.MouseEvent<HTMLElement>, node: NodeProps) => void;
}

export type NodeProps = xyNodeProps<Node<NodeData>>;

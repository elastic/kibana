/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from '@emotion/styled';
import {
  type EuiIconProps,
  type _EuiBackgroundColor,
  EuiButtonIcon,
  EuiIcon,
  EuiText,
  useEuiBackgroundColor,
  useEuiTheme,
} from '@elastic/eui';
import { rgba } from 'polished';
import { getSpanIcon } from './get_span_icon';
import type { NodeExpandButtonProps } from './node_expand_button';

export const LABEL_PADDING_X = 15;
export const LABEL_BORDER_WIDTH = 1;
export const NODE_WIDTH = 90;
export const NODE_HEIGHT = 90;
const NODE_LABEL_WIDTH = 120;

export const LabelNodeContainer = styled.div`
  text-wrap: nowrap;
  min-width: 100px;
  height: 24px;
`;

export const LabelShape = styled(EuiText)`
  background: ${(props) => useEuiBackgroundColor(props.color as _EuiBackgroundColor)};
  border: ${(props) => {
    const { euiTheme } = useEuiTheme();
    return `solid ${
      euiTheme.colors[props.color as keyof typeof euiTheme.colors]
    } ${LABEL_BORDER_WIDTH}px`;
  }};

  font-weight: ${(_props) => {
    const { euiTheme } = useEuiTheme();
    return `${euiTheme.font.weight.semiBold}`;
  }};
  font-size: ${(_props) => {
    const { euiTheme } = useEuiTheme();
    return `${euiTheme.font.scale.xs * 10.5}px`;
  }};

  line-height: 1.5;

  padding: 5px ${LABEL_PADDING_X}px;
  border-radius: 16px;
  min-height: 100%;
  min-width: 100%;
`;

export const LabelShapeOnHover = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s ease; /* Smooth transition */
  border: ${(props) => {
    const { euiTheme } = useEuiTheme();
    return `dashed ${rgba(
      euiTheme.colors[props.color as keyof typeof euiTheme.colors] as string,
      0.5
    )} 1px`;
  }};
  border-radius: 20px;
  background: transparent;
  width: 108%;
  height: 134%;

  ${LabelNodeContainer}:hover & {
    opacity: 1; /* Show on hover */
  }

  .react-flow__node:focus:focus-visible & {
    opacity: 1; /* Show on hover */
  }
`;

export const NodeShapeContainer = styled.div`
  position: relative;
  width: ${NODE_WIDTH}px;
  height: ${NODE_HEIGHT}px;
`;

export const NodeShapeSvg = styled.svg`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
`;

export interface NodeButtonProps {
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

export const NodeButton: React.FC<NodeButtonProps> = ({ onClick }) => (
  <StyledNodeContainer>
    <StyledNodeButton onClick={onClick} />
  </StyledNodeContainer>
);

const StyledNodeContainer = styled.div`
  position: absolute;
  width: ${NODE_WIDTH}px;
  height: ${NODE_HEIGHT}px;
  z-index: 1;
`;

const StyledNodeButton = styled.div`
  width: ${NODE_WIDTH}px;
  height: ${NODE_HEIGHT}px;
`;

export const StyledNodeExpandButton = styled.div<NodeExpandButtonProps>`
  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s ease; /* Smooth transition */
  ${(props: NodeExpandButtonProps) =>
    (Boolean(props.x) || Boolean(props.y)) &&
    `transform: translate(${props.x ?? '0'}, ${props.y ?? '0'});`}
  position: absolute;
  z-index: 1;

  &.toggled {
    opacity: 1;
  }

  ${NodeShapeContainer}:hover & {
    opacity: 1; /* Show on hover */
  }

  &:has(button:focus) {
    opacity: 1; /* Show when button is active */
  }

  .react-flow__node:focus:focus-visible & {
    opacity: 1; /* Show on node focus */
  }
`;

export const NodeShapeOnHoverSvg = styled(NodeShapeSvg)`
  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s ease; /* Smooth transition */

  ${NodeShapeContainer}:hover & {
    opacity: 1; /* Show on hover */
  }

  ${NodeShapeContainer}:has(${StyledNodeExpandButton}.toggled) & {
    opacity: 1; /* Show on hover */
  }

  .react-flow__node:focus:focus-visible & {
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
  width: ${NODE_LABEL_WIDTH}px;
  margin-left: ${-(NODE_LABEL_WIDTH - NODE_WIDTH) / 2}px;
  text-overflow: ellipsis;
  // white-space: nowrap;
  overflow: hidden;
`;

NodeLabel.defaultProps = {
  size: 'xs',
  textAlign: 'center',
};

export const ExpandButtonSize = 18;

export const RoundEuiButtonIcon = styled(EuiButtonIcon)`
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

export const HandleStyleOverride: React.CSSProperties = {
  background: 'none',
  border: 'none',
};

export const GroupStyleOverride = (size?: {
  width: number;
  height: number;
}): React.CSSProperties => ({
  backgroundColor: 'transparent',
  border: '0px solid',
  boxShadow: 'none',
  width: size?.width ?? 140,
  height: size?.height ?? 75,
});

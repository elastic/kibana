/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiIcon,
  useEuiBackgroundColor,
  useEuiTheme,
  type EuiIconProps,
  type _EuiBackgroundColor,
  EuiListGroupItemProps,
  EuiListGroupItem,
  EuiText,
} from '@elastic/eui';
import styled from '@emotion/styled';

const IconContainer = styled.div`
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: ${(props) => {
    const { euiTheme } = useEuiTheme();
    return euiTheme.colors[props.color as keyof typeof euiTheme.colors] as string;
  }};
  background-color: ${(props) => useEuiBackgroundColor(props.color as _EuiBackgroundColor)};
  border: 1px solid
    ${(props) => {
      const { euiTheme } = useEuiTheme();
      return euiTheme.colors[props.color as keyof typeof euiTheme.colors] as string;
    }};
  margin-right: 8px;
`;

const StyleEuiIcon = styled(EuiIcon)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

const RoundedEuiIcon: React.FC<EuiIconProps> = ({ ...rest }) => (
  <IconContainer color={rest.color}>
    <StyleEuiIcon {...rest} />
  </IconContainer>
);

export const ExpandPopoverListItem: React.FC<
  Pick<EuiListGroupItemProps, 'iconType' | 'label' | 'onClick'>
> = (props) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiListGroupItem
      icon={
        props.iconType ? (
          <RoundedEuiIcon color="primary" type={props.iconType} size="s" />
        ) : undefined
      }
      label={
        <EuiText size="s" color={euiTheme.colors.primaryText}>
          {props.label}
        </EuiText>
      }
      onClick={props.onClick}
    />
  );
};

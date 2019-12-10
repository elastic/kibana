/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import styled from 'styled-components';
import { units, px, fontSizes } from '../../../../style/variables';
import theme from '@elastic/eui/dist/eui_theme_light.json';

const Container = styled.div`
  display: flex;
  align-items: center;
  font-size: ${props => props.fontSize};
  color: ${theme.euiColorDarkShade};
  cursor: ${props => (props.clickable ? 'pointer' : 'initial')};
  opacity: ${props => (props.disabled ? 0.4 : 1)};
  user-select: none;
`;

export const Indicator = styled.span`
  width: ${props => px(props.radius)};
  height: ${props => px(props.radius)};
  margin-right: ${props => px(props.radius / 2)};
  background: ${props => props.color};
  border-radius: 100%;
`;

export default class Legend extends PureComponent {
  render() {
    const {
      onClick,
      text,
      color = theme.euiColorVis1,
      fontSize = fontSizes.small,
      radius = units.minus - 1,
      disabled = false,
      clickable = false,
      indicator,
      ...rest
    } = this.props;
    return (
      <Container
        onClick={onClick}
        disabled={disabled}
        clickable={clickable || Boolean(onClick)}
        fontSize={fontSize}
        {...rest}
      >
        {indicator ? (
          indicator({ color, radius })
        ) : (
          <Indicator color={color} radius={radius} />
        )}
        {text}
      </Container>
    );
  }
}

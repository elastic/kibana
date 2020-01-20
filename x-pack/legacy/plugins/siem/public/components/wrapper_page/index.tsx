/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import classNames from 'classnames';
import React from 'react';
import styled, { css } from 'styled-components';

import { gutterTimeline } from '../../lib/helpers';
import { AppGlobalStyle } from '../page/index';

const Wrapper = styled.div`
  ${({ theme }) => css`
    padding: ${theme.eui.paddingSizes.l} ${gutterTimeline} ${theme.eui.paddingSizes.l}
      ${theme.eui.paddingSizes.l};

    &.siemWrapperPage--restrictWidthDefault,
    &.siemWrapperPage--restrictWidthCustom {
      box-sizing: content-box;
      margin: 0 auto;
    }

    &.siemWrapperPage--restrictWidthDefault {
      max-width: 1000px;
    }
  `}
`;

Wrapper.displayName = 'Wrapper';

interface WrapperPageProps {
  children: React.ReactNode;
  className?: string;
  restrictWidth?: boolean | number | string;
  style?: Record<string, string>;
}

const WrapperPageComponent: React.FC<WrapperPageProps> = ({
  children,
  className,
  restrictWidth,
  style,
}) => {
  const classes = classNames(className, {
    siemWrapperPage: true,
    'siemWrapperPage--restrictWidthDefault':
      restrictWidth && typeof restrictWidth === 'boolean' && restrictWidth === true,
    'siemWrapperPage--restrictWidthCustom': restrictWidth && typeof restrictWidth !== 'boolean',
  });

  let customStyle: WrapperPageProps['style'];

  if (restrictWidth && typeof restrictWidth !== 'boolean') {
    const value = typeof restrictWidth === 'number' ? `${restrictWidth}px` : restrictWidth;
    customStyle = { ...style, maxWidth: value };
  }

  return (
    <Wrapper className={classes} style={customStyle || style}>
      {children}
      <AppGlobalStyle />
    </Wrapper>
  );
};

export const WrapperPage = React.memo(WrapperPageComponent);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface ScrollButtonProps {
  onClick: () => void;
}

export const ScrollButton: React.FC<ScrollButtonProps> = ({ onClick }) => {
  const { euiTheme } = useEuiTheme();

  const scrollDownButtonStyles = css`
    position: absolute;
    bottom: ${euiTheme.size.l};
    left: 50%;
    transform: translateX(-50%);
    z-index: 1;
  `;

  return (
    <EuiButtonIcon
      display="base"
      size="s"
      color="text"
      css={scrollDownButtonStyles}
      iconType="sortDown"
      aria-label="Scroll down"
      onClick={onClick}
    />
  );
};

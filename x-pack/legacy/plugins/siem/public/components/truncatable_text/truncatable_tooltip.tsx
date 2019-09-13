/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip, ToolTipPositions } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

const Wrapper = styled.span`
  .euiToolTipAnchor {
    display: inline;
  }
`;
Wrapper.displayName = 'Wrapper';

export interface TruncatableTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: ToolTipPositions;
}

export const TruncatableTooltip = pure<TruncatableTooltipProps>(
  ({ children, content, position }) => (
    <Wrapper>
      <EuiToolTip content={content} position={position}>
        {children}
      </EuiToolTip>
    </Wrapper>
  )
);
TruncatableTooltip.displayName = 'TruncatableTooltip';

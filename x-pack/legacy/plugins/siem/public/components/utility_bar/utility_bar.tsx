/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

interface AsideProps {
  border?: boolean;
}

const Aside = styled.aside.attrs({
  className: 'siemUtilityBar',
})<AsideProps>`
  ${({ border, theme }) => css`
    ${border &&
      css`
        border-bottom: ${theme.eui.euiBorderThin};
        padding-bottom: ${theme.eui.paddingSizes.s};
      `}
  `}
`;
Aside.displayName = 'Aside';

export interface UtilityBarProps extends AsideProps {
  children: React.ReactNode;
}

export const UtilityBar = React.memo<UtilityBarProps>(({ border, children }) => (
  <Aside border={border}>
    <EuiFlexGroup justifyContent="spaceBetween">{children}</EuiFlexGroup>
  </Aside>
));
UtilityBar.displayName = 'UtilityBar';

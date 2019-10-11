/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled, { css } from 'styled-components';

const Group = styled.div.attrs({
  className: 'siemUtilityBar__group',
})`
  ${({ theme }) => css`
    border-right: ${theme.eui.euiBorderThin};
    padding-right: ${theme.eui.paddingSizes.m};

    &:last-child {
      border-right: none;
      padding-right: 0;
    }

    &,
    & > * {
      display: inline-block;
      margin-right: ${theme.eui.paddingSizes.m};

      &:last-child {
        margin-right: 0;
      }
    }
  `}
`;
Group.displayName = 'Group';

export interface UtilityBarGroupProps {
  children: React.ReactNode;
}

export const UtilityBarGroup = React.memo<UtilityBarGroupProps>(({ children }) => (
  <Group>{children}</Group>
));
UtilityBarGroup.displayName = 'UtilityBarGroup';

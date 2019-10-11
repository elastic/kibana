/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled, { css } from 'styled-components';

const Text = styled.p.attrs({
  className: 'siemUtilityBar__text',
})`
  ${({ theme }) => css`
    color: ${theme.eui.textColors.subdued};
    font-size: ${theme.eui.euiFontSizeXS};
    line-height: ${theme.eui.euiLineHeight};
  `}
`;
Text.displayName = 'Text';

export interface UtilityBarTextProps {
  children: string;
}

export const UtilityBarText = React.memo<UtilityBarTextProps>(({ children }) => (
  <Text>{children}</Text>
));
UtilityBarText.displayName = 'UtilityBarText';

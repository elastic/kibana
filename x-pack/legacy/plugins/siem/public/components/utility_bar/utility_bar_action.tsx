/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

interface LinkProps {
  href?: string;
  onClick?: Function;
}

const Link = styled(EuiLink).attrs({
  className: 'siemUtilityBar__action',
})<LinkProps>`
  ${({ theme }) => css`
    font-size: ${theme.eui.euiFontSizeXS};
    line-height: ${theme.eui.euiLineHeight};
  `}
`;
Link.displayName = 'Link';

export interface UtilityBarActionProps extends LinkProps {
  children: React.ReactNode;
}

export const UtilityBarAction = React.memo<UtilityBarActionProps>(({ children, href, onClick }) => (
  <Link href={href} onClick={onClick}>
    {children}
  </Link>
));
UtilityBarAction.displayName = 'UtilityBarAction';

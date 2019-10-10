/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiLink } from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

interface LinkProps {
  href: string;
}

const Link = styled(EuiLink).attrs({
  className: 'siemLinkBack',
})<LinkProps>`
  ${({ theme }) => css`
    display: inline-block;
    font-size: ${theme.eui.euiFontSizeXS};
    line-height: ${theme.eui.euiLineHeight};
    margin-bottom: ${theme.eui.euiSizeS};

    .euiIcon {
      margin-right: ${theme.eui.euiSizeXS};
    }
  `}
`;
Link.displayName = 'Link';

export interface LinkBackProps extends LinkProps {
  text: string;
}

export const LinkBack = React.memo<LinkBackProps>(({ href, text }) => (
  <Link href={href}>
    <EuiIcon size="s" type="arrowLeft" />
    {text}
  </Link>
));
LinkBack.displayName = 'LinkBack';

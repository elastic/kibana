/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiLink, IconSize, IconType } from '@elastic/eui';
import { LinkAnchorProps } from '@elastic/eui/src/components/link/link';
import React from 'react';
import styled, { css } from 'styled-components';

interface LinkProps {
  color?: LinkAnchorProps['color'];
  href?: string;
  iconSide?: 'left' | 'right';
  onClick?: Function;
}

const Link = styled(({ iconSide, children, ...rest }) => <EuiLink {...rest}>{children}</EuiLink>)<
  LinkProps
>`
  ${({ iconSide, theme }) => css`
    align-items: center;
    display: inline-flex;
    vertical-align: top;
    white-space: nowrap;

    ${iconSide === 'left' &&
      css`
        .euiIcon {
          margin-right: ${theme.eui.euiSizeXS};
        }
      `}

    ${iconSide === 'right' &&
      css`
        flex-direction: row-reverse;

        .euiIcon {
          margin-left: ${theme.eui.euiSizeXS};
        }
      `}
  `}
`;
Link.displayName = 'Link';

export interface LinkIconProps extends LinkProps {
  children: string;
  iconSize?: IconSize;
  iconType: IconType;
}

export const LinkIcon = React.memo<LinkIconProps>(
  ({ children, color, href, iconSide = 'left', iconSize = 's', iconType, onClick }) => (
    <Link className="siemLinkIcon" color={color} href={href} iconSide={iconSide} onClick={onClick}>
      <EuiIcon size={iconSize} type={iconType} />
      <span className="siemLinkIcon__label">{children}</span>
    </Link>
  )
);
LinkIcon.displayName = 'LinkIcon';

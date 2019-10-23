/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiLink, IconSize, IconType } from '@elastic/eui';
import { LinkAnchorProps } from '@elastic/eui/src/components/link/link';
import React from 'react';
import styled, { css } from 'styled-components';

interface IconOptions {
  side?: 'left' | 'right';
  size?: IconSize;
  type: IconType;
}

interface LinkProps {
  className?: string;
  color?: LinkAnchorProps['color'];
  href?: string;
  // iconSide?: 'left' | 'right';
  iconOptions: IconOptions;
  onClick?: Function;
}

const Link = styled(EuiLink).attrs({
  className: 'siemLinkIcon',
})<LinkProps>`
  ${({ iconOptions, theme }) => css`
    align-items: center;
    display: inline-flex;
    vertical-align: top;
    white-space: nowrap;

    ${iconOptions.side === 'left' &&
      css`
        .euiIcon {
          margin-right: ${theme.eui.euiSizeXS};
        }
      `}

    ${iconOptions.side === 'right' &&
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
  // iconSize?: IconSize;
  // iconType: IconType;
}

export const LinkIcon = React.memo<LinkIconProps>(
  ({ children, className, color, href, iconOptions = { side: 'left', size: 's' }, onClick }) => (
    <Link
      className={className}
      color={color}
      href={href}
      iconOptions={iconOptions}
      onClick={onClick}
    >
      <EuiIcon size={iconOptions.size} type={iconOptions.type} />
      <span className="siemLinkIcon__label">{children}</span>
    </Link>
  )
);
LinkIcon.displayName = 'LinkIcon';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed, IconSize, IconType } from '@elastic/eui';
import { EuiIcon, EuiLink, useEuiTheme } from '@elastic/eui';
import type { LinkAnchorProps } from '@elastic/eui/src/components/link/link';
import type { ReactNode } from 'react';
import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';

interface LinkProps {
  ariaLabel?: string;
  color?: LinkAnchorProps['color'];
  disabled?: boolean;
  href?: string;
  iconSide?: 'left' | 'right';
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

export const getLinkCss = ({
  euiTheme,
  iconSide,
}: {
  euiTheme: EuiThemeComputed<{}>;
  iconSide?: 'left' | 'right';
}) =>
  css`
    align-items: center;
    display: inline-flex;
    vertical-align: top;
    white-space: nowrap;
    ${iconSide === 'left' &&
    css`
      .euiIcon {
        margin-right: ${euiTheme.size.xs};
      }
    `}
    ${iconSide === 'right' &&
    css`
      flex-direction: row-reverse;

      .euiIcon {
        margin-left: ${euiTheme.size.xs};
      }
    `}
  `;

export interface LinkIconProps extends LinkProps {
  children: string | ReactNode;
  iconSize?: IconSize;
  iconType: IconType;
  dataTestSubj?: string;
}

export const LinkIcon = React.memo<LinkIconProps>(
  ({
    ariaLabel,
    children,
    color,
    dataTestSubj,
    disabled,
    href,
    iconSide = 'left',
    iconSize = 's',
    iconType,
    onClick,
  }) => {
    const { euiTheme } = useEuiTheme();
    const getChildrenString = useCallback((theChild: string | ReactNode): string => {
      if (
        typeof theChild === 'object' &&
        theChild != null &&
        'props' in theChild &&
        theChild.props &&
        theChild.props.children
      ) {
        return getChildrenString(theChild.props.children);
      }
      return theChild != null && Object.keys(theChild).length > 0 ? (theChild as string) : '';
    }, []);

    const aria = useMemo(() => {
      if (ariaLabel) {
        return ariaLabel;
      }
      return getChildrenString(children);
    }, [ariaLabel, children, getChildrenString]);

    return (
      <EuiLink
        className="casesLinkIcon"
        color={color}
        data-test-subj={dataTestSubj}
        disabled={disabled}
        css={getLinkCss({ euiTheme, iconSide })}
        onClick={onClick}
        aria-label={aria}
      >
        <EuiIcon size={iconSize} type={iconType} />
        <span className="casesLinkIcon__label">{children}</span>
      </EuiLink>
    );
  }
);
LinkIcon.displayName = 'LinkIcon';

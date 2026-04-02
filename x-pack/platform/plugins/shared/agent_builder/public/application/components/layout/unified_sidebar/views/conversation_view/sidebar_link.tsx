/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

interface SidebarLinkProps {
  label: string;
  href: string;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export const SidebarLink: React.FC<SidebarLinkProps> = ({ label, href, onClick }) => {
  const { euiTheme } = useEuiTheme();

  const wrapperStyles = css`
    display: flex;
    align-items: center;
    height: 100%;
    padding: ${euiTheme.size.base};
  `;

  const linkStyles = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    text-decoration: none;
    color: inherit;
    padding: 6px ${euiTheme.size.s};
    border-radius: ${euiTheme.border.radius.medium};

    &:hover {
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
      text-decoration: none;
    }

    &:focus-visible {
      outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
      outline-offset: -${euiTheme.focus.width};
    }
  `;

  return (
    <div css={wrapperStyles}>
      <a href={href} onClick={onClick} css={linkStyles}>
        <EuiText size="s">{label}</EuiText>
        <EuiIcon
          type="arrowRight"
          size="s"
          aria-hidden={true}
          css={css`
            color: ${euiTheme.colors.textDisabled};
          `}
        />
      </a>
    </div>
  );
};

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

  const linkStyles = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    text-decoration: none;
    color: inherit;
    padding: ${euiTheme.size.base + 6}px ${euiTheme.size.base}px;

    &:focus-visible {
      outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
      outline-offset: -${euiTheme.focus.width};
    }
  `;

  return (
    <a href={href} onClick={onClick} css={linkStyles}>
      <EuiText size="s">{label}</EuiText>
      <EuiIcon type="arrowRight" size="s" aria-hidden={true} color="textDisabled" />
    </a>
  );
};

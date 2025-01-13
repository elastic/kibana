/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, logicalCSS, UseEuiTheme } from '@elastic/eui';

const collapsibleStatementStyle = ({ euiTheme }: UseEuiTheme) => css`
  ${logicalCSS('padding-left', euiTheme.size.m)}
`;

function getToggleIconType(isCollapsed: boolean) {
  return isCollapsed ? 'arrowRight' : 'arrowDown';
}

interface CollapsibleStatementProps {
  children: React.ReactNode;
  collapse: (id: string) => void;
  expand: (id: string) => void;
  id: string;
  isCollapsed: boolean;
}

export function CollapsibleStatement({
  children,
  collapse,
  expand,
  id,
  isCollapsed,
}: CollapsibleStatementProps) {
  const toggleClicked = () => {
    if (isCollapsed) {
      expand(id);
    } else {
      collapse(id);
    }
  };

  return (
    <EuiFlexGroup
      alignItems="center"
      css={collapsibleStatementStyle}
      gutterSize="none"
      responsive={false}
    >
      <EuiFlexItem key={id} grow={false}>
        <EuiButtonIcon
          aria-label="collapse"
          color="text"
          iconType={getToggleIconType(isCollapsed)}
          onClick={toggleClicked}
          size="s"
        />
      </EuiFlexItem>
      {children}
    </EuiFlexGroup>
  );
}

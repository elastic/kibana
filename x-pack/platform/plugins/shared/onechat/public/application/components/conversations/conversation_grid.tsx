/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

interface ConversationGridProps {
  children: React.ReactNode;
  className?: string;
}

export const ConversationGrid: React.FC<ConversationGridProps> = ({ children, className }) => {
  const { euiTheme } = useEuiTheme();
  const sideColumnWidth = `minmax(calc(${euiTheme.size.xxl} * 2), 1fr)`;
  const contentMaxWidth = `calc(${euiTheme.size.xl} * 25)`;
  const gridStyles = css`
    display: grid;
    grid-template-columns: ${sideColumnWidth} minmax(auto, ${contentMaxWidth}) ${sideColumnWidth};
    align-items: center;
    width: 100%;
  `;

  return (
    <div css={gridStyles} className={className}>
      {children}
    </div>
  );
};

interface ConversationContentProps {
  children: React.ReactNode;
  className?: string;
}

const contentStyles = css`
  grid-column: 2;
`;

export const ConversationContent: React.FC<ConversationContentProps> = ({
  children,
  className,
}) => {
  return (
    <ConversationGrid className={className}>
      <div css={contentStyles}>{children}</div>
    </ConversationGrid>
  );
};

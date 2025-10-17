/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useConversationGridCenterColumnWidth } from './conversation_grid.styles';

// Main grid

interface ConversationGridProps {
  children: React.ReactNode;
  className?: string;
}

export const ConversationGrid: React.FC<ConversationGridProps> = ({ children, className }) => {
  const { euiTheme } = useEuiTheme();
  const sideColumnWidth = `minmax(calc(${euiTheme.size.xxl} * 2), 1fr)`;
  const contentMarginWidth = euiTheme.size.l;
  const centerColumnWidth = useConversationGridCenterColumnWidth();
  const gridStyles = css`
    display: grid;
    grid-template-columns:
      ${sideColumnWidth} ${contentMarginWidth} minmax(auto, ${centerColumnWidth})
      ${contentMarginWidth} ${sideColumnWidth};
    align-items: center;
    width: 100%;
  `;

  return (
    <div css={gridStyles} className={className}>
      {children}
    </div>
  );
};

interface ConversationGridContainerProps {
  children: React.ReactNode;
  className?: string;
}

// Left side column

const leftContainerStyles = css`
  grid-column: 1;
`;

export const ConversationLeft: React.FC<ConversationGridContainerProps> = ({
  children,
  className,
}) => {
  return (
    <div css={leftContainerStyles} className={className}>
      {children}
    </div>
  );
};

// Center column without the margins

const centerContainerStyles = css`
  grid-column: 3;
`;

export const ConversationCenter: React.FC<ConversationGridContainerProps> = ({
  children,
  className,
}) => {
  return (
    <div css={centerContainerStyles} className={className}>
      {children}
    </div>
  );
};

// Right side column

const rightContainerStyles = css`
  grid-column: 5;
`;

export const ConversationRight: React.FC<ConversationGridContainerProps> = ({
  children,
  className,
}) => {
  return (
    <div css={rightContainerStyles} className={className}>
      {children}
    </div>
  );
};

// Shorthand for using centered content in the grid

export const ConversationContent: React.FC<ConversationGridContainerProps> = ({
  children,
  className,
}) => {
  return (
    <ConversationGrid className={className}>
      <ConversationCenter>{children}</ConversationCenter>
    </ConversationGrid>
  );
};

// Shorthand for using centered content with margins in the grid

const contentWithMarginsStyles = css`
  grid-column: 2 / 5;
`;

export const ConversationContentWithMargins: React.FC<ConversationGridContainerProps> = ({
  children,
  className,
}) => {
  return (
    <ConversationGrid className={className}>
      <div css={contentWithMarginsStyles}>{children}</div>
    </ConversationGrid>
  );
};

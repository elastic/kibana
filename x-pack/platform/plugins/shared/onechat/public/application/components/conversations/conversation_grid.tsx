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
import { useEmbeddableMode } from '../../context/embeddable_mode_context';

// Main grid

interface ConversationGridProps {
  children: React.ReactNode;
  className?: string;
}

export const ConversationGrid: React.FC<ConversationGridProps> = ({ children, className }) => {
  const { euiTheme } = useEuiTheme();
  const { isEmbeddedMode } = useEmbeddableMode();
  const sideColumnWidth = `minmax(calc(${euiTheme.size.xxl} * 2), 1fr)`;
  const contentMarginWidth = euiTheme.size.l;
  const centerColumnWidth = useConversationGridCenterColumnWidth();
  
  // In embeddable mode, use a simpler grid without side margins
  const gridStyles = isEmbeddedMode
    ? css`
        display: grid;
        grid-template-columns: ${contentMarginWidth} 1fr ${contentMarginWidth};
        align-items: center;
        width: 100%;
      `
    : css`
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

export const ConversationLeft: React.FC<ConversationGridContainerProps> = ({
  children,
  className,
}) => {
  const { isEmbeddedMode } = useEmbeddableMode();
  // In embeddable mode, there's no left column, so hide it
  if (isEmbeddedMode) {
    return null;
  }
  
  const leftContainerStyles = css`
    grid-column: 1;
  `;
  
  return (
    <div css={leftContainerStyles} className={className}>
      {children}
    </div>
  );
};

// Center column without the margins

export const ConversationCenter: React.FC<ConversationGridContainerProps> = ({
  children,
  className,
}) => {
  const { isEmbeddedMode } = useEmbeddableMode();
  
  // In embeddable mode, center content is in column 2; in standalone mode it's in column 3
  const centerContainerStyles = css`
    grid-column: ${isEmbeddedMode ? '2' : '3'};
  `;
  
  return (
    <div css={centerContainerStyles} className={className}>
      {children}
    </div>
  );
};

// Right side column

export const ConversationRight: React.FC<ConversationGridContainerProps> = ({
  children,
  className,
}) => {
  const { isEmbeddedMode } = useEmbeddableMode();
  // In embeddable mode, there's no right column, so hide it
  if (isEmbeddedMode) {
    return null;
  }
  
  const rightContainerStyles = css`
    grid-column: 5;
  `;
  
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

export const ConversationContentWithMargins: React.FC<ConversationGridContainerProps> = ({
  children,
  className,
}) => {
  const { isEmbeddedMode } = useEmbeddableMode();
  
  // In embeddable mode, span all 3 columns; in standalone mode, span columns 2-5
  const contentWithMarginsStyles = css`
    grid-column: ${isEmbeddedMode ? '1 / 4' : '2 / 5'};
  `;
  
  return (
    <ConversationGrid className={className}>
      <div css={contentWithMarginsStyles}>{children}</div>
    </ConversationGrid>
  );
};

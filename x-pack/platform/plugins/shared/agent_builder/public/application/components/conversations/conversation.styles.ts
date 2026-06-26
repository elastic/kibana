/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { layoutLevels } from '@kbn/ui-chrome-layout-constants';

// Total measured header height (row + thin bottom border), matching the application panel header.
export const headerHeight = 50;

export const conversationHeaderShellStyles = (
  euiTheme: EuiThemeComputed<{}>,
  borderless = false
) => css`
  position: sticky;
  top: 0;
  z-index: ${layoutLevels.applicationTopBar};
  flex-shrink: 0;
  box-sizing: border-box;
  padding: 0;
  background: ${euiTheme.colors.backgroundBasePlain};
  ${!borderless &&
  css`
    border-bottom: ${euiTheme.border.thin};
    margin-bottom: -${euiTheme.border.width.thin};
  `}
`;

export const conversationHeaderRowStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: calc(${headerHeight}px - ${euiTheme.border.width.thin});
  padding-inline: ${euiTheme.size.m};
  padding-block: ${euiTheme.size.s};
  width: 100%;
`;

export const conversationHeaderCondensedRowStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  gap: ${euiTheme.size.s};
  padding-inline: ${euiTheme.size.s};
  padding-block: ${euiTheme.size.s};
  width: 100%;
`;

const maxConversationWidthStyles = css`
  max-width: 800px;
`;

export const conversationElementPaddingStyles = css`
  padding: 0px 16px;
`;

// Ensures the conversation element is always 100% of it's parent or 800px, whichever is smaller.
export const conversationElementWidthStyles = css`
  width: 100%;
  ${maxConversationWidthStyles}
`;

export const fullWidthAndHeightStyles = css`
  width: 100%;
  height: 100%;
`;

export const conversationBackgroundStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  background: linear-gradient(
    180deg,
    ${euiTheme.colors.backgroundBasePlain} 21.09%,
    ${euiTheme.colors.backgroundBaseSubdued} 51.44%,
    ${euiTheme.colors.backgroundBasePlain} 87.98%
  );
`;

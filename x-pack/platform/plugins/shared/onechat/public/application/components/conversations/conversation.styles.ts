/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

export const headerHeight = 88;

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

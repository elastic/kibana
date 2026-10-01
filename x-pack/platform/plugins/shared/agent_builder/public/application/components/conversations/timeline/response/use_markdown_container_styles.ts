/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiFontSize, type UseEuiTheme } from '@elastic/eui';

// EUI's default heading sizes are too large for chat messages.
const HEADING_FONT_SCALES = [
  ['h1', 'l'],
  ['h2', 'm'],
  ['h3', 's'],
  ['h4', 's'],
  ['h5', 's'],
  ['h6', 's'],
] as const;

export const markdownContainerStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;

  const headingStyles = HEADING_FONT_SCALES.map(([heading, scale]) => {
    const { fontSize, lineHeight } = euiFontSize(euiThemeContext, scale);
    return `
      .euiMarkdownFormat ${heading} {
        font-size: ${fontSize};
        line-height: ${lineHeight};
      }
    `;
  }).join('');

  return css`
    overflow-wrap: anywhere;

    /* Standardize spacing between numbered list items */
    ol > li:not(:first-child) {
      margin-top: ${euiTheme.size.s};
    }

    ol > li > p {
      margin-bottom: ${euiTheme.size.s};
    }

    .euiMarkdownFormat > ul > li,
    .euiMarkdownFormat > ol > li {
      line-height: ${euiTheme.size.l};
    }

    ${headingStyles}
  `;
};

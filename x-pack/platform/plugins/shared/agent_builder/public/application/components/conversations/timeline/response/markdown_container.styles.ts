/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';

/** Container styles shared by agent responses and user messages rendered as markdown. */
export const markdownContainerStyles = (euiTheme: EuiThemeComputed) => css`
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
`;

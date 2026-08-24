/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiScrollBarStyles } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';

/**
 * Constrains a list's height so it scrolls independently inside EuiModalBody.
 * EuiModalBody already scrolls and has no fixed height, so without an explicit
 * max-block-size the inner container grows the modal body and the scrollbar never appears.
 * The min() clamp prevents both scrollbars from appearing at short viewport heights.
 */
export const scrollableListStyles = (euiThemeContext: UseEuiTheme) => css`
  ${euiScrollBarStyles(euiThemeContext)}
  max-block-size: min(${euiThemeContext.euiTheme.base * 21}px, 34vh);
  overflow-y: auto;
  padding: ${euiThemeContext.euiTheme.size.xxs};
`;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { logicalCSS } from '@elastic/eui';
import { css } from '@emotion/react';

// Can be used for any portal content that would be covered by the push flyout
export const pushFlyoutPaddingStyles = css`
  ${logicalCSS('padding-right', `var(--euiPushFlyoutOffsetInlineEnd, 0px)`)};
  ${logicalCSS('padding-left', `var(--euiPushFlyoutOffsetInlineStart, 0px)`)};
`;

const ROUNDED_BORDER_RADIUS = '6px';
export const ROUNDED_BORDER_RADIUS_LARGE = '12px';
const ROUNDED_BORDER_RADIUS_EXTRA_LARGE = '16px';

export const roundedBorderRadiusStyles = css`
  border-radius: ${ROUNDED_BORDER_RADIUS};
`;
export const borderRadiusXlStyles = css`
  border-radius: ${ROUNDED_BORDER_RADIUS_EXTRA_LARGE};
`;

export const lineClampStyles = (numLines: number) => css`
  display: -webkit-box;
  -webkit-line-clamp: ${numLines};
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

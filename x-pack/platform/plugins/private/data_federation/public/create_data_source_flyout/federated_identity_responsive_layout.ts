/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

/** Side-by-side when the flyout is wide enough; wraps to a second row when it is not. */
export const federatedIdentityInlineFlexGroupCss = css`
  flex-wrap: wrap;
  align-items: flex-start;
`;

/** Setup method cards share a row when two cards fit (~12rem each). */
export const federatedIdentitySetupMethodCardItemCss = css`
  flex: 1 1 12rem;
  min-width: 0;
`;

/** Deploy copy grows beside the launch button until the button wraps. */
export const federatedIdentityDeployCopyItemCss = css`
  flex: 1 1 16rem;
  min-width: 0;
`;

export const federatedIdentityDeployActionItemCss = css`
  flex: 0 0 auto;
`;

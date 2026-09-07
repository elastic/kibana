/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

export const MAIN_FLYOUT_TEST_SUBJ = 'esqlViewsCreateEditFlyout';

// Doubled attribute selector bumps specificity so this wins over EUI flyout
// `!important` size rules regardless of stylesheet insertion order.
export const mainFlyoutSelector = `[data-test-subj="${MAIN_FLYOUT_TEST_SUBJ}"][data-test-subj="${MAIN_FLYOUT_TEST_SUBJ}"]`;

/**
 * True `size="m"` width (50% of the viewport) without EUI's min/max clamps.
 * Shared by v1 and v2 so the main flyout matches on initial load.
 */
export const mainFlyoutSizeStyles = css`
  ${mainFlyoutSelector} {
    min-width: 0 !important;
    width: 50% !important;
    max-width: 50% !important;
  }
`;

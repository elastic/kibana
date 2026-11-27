/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

const DIMMED_NODE_OPACITY = 0.3;
const DIMMED_EDGE_OPACITY = 0.15;

export const kiGraphFocusDimmingCss = css`
  &[data-ki-graph-focus='true'] [data-ki-graph-node-shell]:not([data-ki-graph-highlighted='true']) {
    opacity: ${DIMMED_NODE_OPACITY};
  }

  &[data-ki-graph-focus='true'] [data-ki-graph-edge]:not([data-ki-graph-highlighted='true']) {
    opacity: ${DIMMED_EDGE_OPACITY};
  }
`;

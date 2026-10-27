/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Frame } from '@elastic/isomer-sdk';
import {
  type BorealisTokenValues,
  borealisDark,
  borealisLight,
  ISOMER_ROOT_CLASS,
} from '@kbn/isomer-theme';

/** The page's inset around the dashboard, as Kibana's viewport leaves around its grid. */
export const DASHBOARD_PAGE_PADDING = 16;

/** The name hosts register {@link dashboardFrame} under, for a draw's `frame`. */
export const DASHBOARD_FRAME = 'dashboard';

/**
 * A dashboard's page: Kibana's viewport background (`backgroundBaseRecessed`) edge to edge, with the dashboard's
 * white panels on it, rather than a card around the whole dashboard.
 */
export const dashboardFrame: Frame<BorealisTokenValues> = {
  defaultWidth: 1200,
  theme: { light: borealisLight, dark: borealisDark },
  estimateHeight: ({ body }, { estimateSnapshotHeight }) =>
    body.reduce(
      (height, node) => height + estimateSnapshotHeight(node),
      2 * DASHBOARD_PAGE_PADDING
    ),
  wrap: (_header, body, { width, height, theme: { color } }) => (
    <div
      className={ISOMER_ROOT_CLASS}
      style={{
        boxSizing: 'border-box',
        width,
        height,
        padding: DASHBOARD_PAGE_PADDING,
        background: color.background.recessed,
        color: color.text.paragraph,
      }}
    >
      {body}
    </div>
  ),
};

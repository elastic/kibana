/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel, DashboardSection } from '@kbn/agent-builder-dashboards-common';
import { getWidgetsBottomY } from '../dashboard_state';
import { GRID_COLUMNS } from './types';

/** Height of a new panel until the layout call places it. */
const PLACEHOLDER_HEIGHT = 10;

/**
 * Returns the grid of a new panel until the layout call places it: full width, below the existing
 * widgets of its container.
 */
export const getPlaceholderGrid = (
  widgets: Array<AttachmentPanel | DashboardSection>
): AttachmentPanel['grid'] => ({
  x: 0,
  y: getWidgetsBottomY(widgets),
  w: GRID_COLUMNS,
  h: PLACEHOLDER_HEIGHT,
});

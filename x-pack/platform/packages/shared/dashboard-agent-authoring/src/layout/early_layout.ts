/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { getErrorMessage } from '../utils';
import {
  arrangeDashboardLayout,
  attemptDashboardLayout,
  getPanelsById,
  hasLayoutChanges,
  needsLayout,
  type ArrangeLayoutResult,
  type LayoutAttempt,
  type Widgets,
} from './arrange_layout';
import type { ArrangeDashboardLayout } from './types';

/** Lays out a dashboard, optionally starting the layout call before panel content resolves. */
export interface DashboardLayout {
  /** Starts the layout call on the dashboard predicted from the upsert plan. */
  start: (predictedDashboardData: DashboardAttachmentData) => void;
  /** Lays out the resolved dashboard, reusing the early arrangement when the prediction held. */
  finish: (dashboardData: DashboardAttachmentData) => Promise<ArrangeLayoutResult>;
}

/** Copies the grids of `arranged` onto the panels and sections of `dashboardData` that it has. */
const copyLayout = (
  arranged: Widgets,
  dashboardData: DashboardAttachmentData
): DashboardAttachmentData => {
  const arrangedPanelsById = getPanelsById(arranged);
  const sectionYById = new Map(
    arranged.filter(isSection).map(({ id, grid }) => [id, grid.y] as const)
  );
  const placePanel = (panel: AttachmentPanel): AttachmentPanel => ({
    ...panel,
    grid: arrangedPanelsById.get(panel.id)?.grid ?? panel.grid,
  });
  return {
    ...dashboardData,
    panels: dashboardData.panels.map((widget) =>
      isSection(widget)
        ? {
            ...widget,
            grid: { y: sectionYById.get(widget.id) ?? widget.grid.y },
            panels: widget.panels.map(placePanel),
          }
        : placePanel(widget)
    ),
  };
};

/**
 * Lays out the dashboard as `arrangeDashboardLayout` does. When `start` is called with the predicted
 * dashboard, the layout call runs while panel content resolves, and `finish` applies its arrangement
 * if the resolved dashboard matches the prediction. Otherwise, e.g. when a panel failed or resolved
 * to another kind, `finish` lays out the resolved dashboard again.
 */
export const createDashboardLayout = ({
  originalPanels,
  instructions,
  arrangeLayout,
  logger,
}: {
  originalPanels: Widgets;
  instructions?: string;
  arrangeLayout: ArrangeDashboardLayout;
  logger: Logger;
}): DashboardLayout => {
  let earlyAttempt: Promise<LayoutAttempt> | undefined;

  return {
    start: (predictedDashboardData) => {
      earlyAttempt = attemptDashboardLayout({
        originalPanels,
        dashboardData: predictedDashboardData,
        instructions,
        arrangeLayout,
      }).catch((error): LayoutAttempt => ({ status: 'failed', error: getErrorMessage(error) }));
    },
    finish: async (dashboardData) => {
      const attempt =
        earlyAttempt && needsLayout({ originalPanels, dashboardData, instructions })
          ? await earlyAttempt
          : undefined;
      if (
        attempt?.status === 'arranged' &&
        !hasLayoutChanges(dashboardData.panels, attempt.dashboardData.panels)
      ) {
        return { dashboardData: copyLayout(attempt.dashboardData.panels, dashboardData) };
      }
      if (attempt?.status === 'failed') {
        logger.debug(`Early dashboard layout failed, laying out again: ${attempt.error}`);
      } else if (attempt?.status === 'arranged') {
        logger.debug('Resolved dashboard differs from the early layout, laying out again');
      }
      return arrangeDashboardLayout({
        originalPanels,
        dashboardData,
        instructions,
        arrangeLayout,
        logger,
      });
    },
  };
};

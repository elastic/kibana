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

/** A layout call started before panel content resolved. */
export interface EarlyLayout {
  /** Lays out the resolved dashboard, reusing the early arrangement where it still fits. */
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
 * Starts the layout call on the dashboard predicted from the upsert plan, so it runs while panel
 * content resolves. `finish` keeps the resolved dashboard as it is when nothing needs placing, e.g.
 * when every planned change failed. It applies the early arrangement when the resolved dashboard
 * matches the prediction. When a panel failed, or resolved to another kind or text, it asks for a
 * repair, with the early arrangement as the previous layout. When the early call or the repair
 * failed, it lays out the resolved dashboard as `arrangeDashboardLayout` does.
 */
export const startEarlyLayout = ({
  originalPanels,
  predictedDashboardData,
  instructions,
  arrangeLayout,
  logger,
}: {
  originalPanels: Widgets;
  predictedDashboardData: DashboardAttachmentData;
  instructions?: string;
  arrangeLayout: ArrangeDashboardLayout;
  logger: Logger;
}): EarlyLayout => {
  const earlyAttempt = attemptDashboardLayout({
    originalPanels,
    dashboardData: predictedDashboardData,
    instructions,
    arrangeLayout,
  }).catch((error): LayoutAttempt => ({ status: 'failed', error: getErrorMessage(error) }));

  return {
    finish: async (dashboardData) => {
      if (!needsLayout({ originalPanels, dashboardData, instructions })) {
        return { dashboardData };
      }
      const layOutResolved = (): Promise<ArrangeLayoutResult> =>
        arrangeDashboardLayout({
          originalPanels,
          dashboardData,
          instructions,
          arrangeLayout,
          logger,
        });

      const attempt = await earlyAttempt;
      if (attempt.status !== 'arranged') {
        if (attempt.status === 'failed') {
          logger.debug(`Early dashboard layout failed, laying out again: ${attempt.error}`);
        }
        return layOutResolved();
      }

      const { panels: arrangedPanels } = attempt.dashboardData;
      const placedDashboardData = copyLayout(arrangedPanels, dashboardData);
      if (!hasLayoutChanges(dashboardData.panels, arrangedPanels)) {
        return { dashboardData: placedDashboardData };
      }
      logger.debug('Resolved dashboard differs from the early layout, repairing it');
      // The early arrangement already follows the instructions, so the repair only fills the gaps.
      const repair = await attemptDashboardLayout({
        originalPanels: arrangedPanels,
        dashboardData: placedDashboardData,
        arrangeLayout,
      });
      if (repair.status === 'arranged') {
        return { dashboardData: repair.dashboardData };
      }
      if (repair.status === 'unchanged') {
        return { dashboardData: placedDashboardData };
      }
      logger.debug(
        `Repairing the early dashboard layout failed, laying out again: ${repair.error}`
      );
      return layOutResolved();
    },
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown-schemas';
import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { indexPanelsById } from '../dashboard_state';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { getErrorMessage, type OperationFailure } from '../utils';
import type { PanelAuthoringNote } from '../resolve_panel';
import {
  GRID_COLUMNS,
  layoutArrangementSchema,
  type ArrangeDashboardLayout,
  type LayoutArrangement,
  type LayoutPanel,
  type LayoutRequest,
} from './types';

/** The text size of a markdown panel, which its height depends on. */
const describeMarkdownText = (content: string): string => {
  const lineCount = content.split('\n').filter((line) => line.trim() !== '').length;
  return `Markdown text of ${content.length} characters in ${lineCount} lines.`;
};

interface ArrangeLayoutParams {
  /** Panels and sections before this call; empty for a new dashboard. */
  originalPanels: DashboardAttachmentData['panels'];
  dashboardData: DashboardAttachmentData;
  /** Existing panels whose content was edited in this call. */
  editedPanelIds: ReadonlySet<string>;
  panelAuthoringNotes: readonly PanelAuthoringNote[];
  /** The user's own arrangement or size request. */
  instructions?: string;
  arrangeLayout: ArrangeDashboardLayout;
  reportFailure: (failure: OperationFailure) => void;
  logger: Logger;
}

/**
 * Sets the grid of every panel and section with the injected `arrangeLayout` model call, when the
 * panels changed or the user asked for a layout change. When the call fails, the dashboard keeps
 * its current layout, and a failure is reported if the user asked for a layout change.
 */
export const arrangeDashboardLayout = async ({
  originalPanels,
  dashboardData,
  editedPanelIds,
  panelAuthoringNotes,
  instructions,
  arrangeLayout,
  reportFailure,
  logger,
}: ArrangeLayoutParams): Promise<DashboardAttachmentData> => {
  const reportUnappliedRequest = (reason: string) => {
    // The agent no longer sees grids, so it can only learn from a failure that the user's request
    // was not applied.
    if (instructions !== undefined) {
      reportFailure({
        type: DASHBOARD_OPERATION_FAILURE_TYPES.layout,
        identifier: 'layout',
        error: `The layout request was not applied, so panel positions and sizes are unchanged: ${reason}`,
      });
    }
  };

  if (dashboardData.panels.length === 0) {
    reportUnappliedRequest('the dashboard has no panels');
    return dashboardData;
  }
  if (
    instructions === undefined &&
    JSON.stringify(originalPanels) === JSON.stringify(dashboardData.panels)
  ) {
    return dashboardData;
  }

  const originalPanelIds = new Set(indexPanelsById(originalPanels).keys());
  const originalSectionIds = new Set(originalPanels.filter(isSection).map(({ id }) => id));
  const authoringNotesByPanelId = new Map(
    panelAuthoringNotes.map(({ panelId, authoringNote }) => [panelId, authoringNote])
  );

  const getAuthoringNote = ({ id, type, config }: AttachmentPanel): string | undefined =>
    authoringNotesByPanelId.get(id) ??
    (type === MARKDOWN_EMBEDDABLE_TYPE && typeof config.content === 'string'
      ? describeMarkdownText(config.content)
      : undefined);

  const toLayoutPanel = (panel: AttachmentPanel): LayoutPanel => {
    const { id, type, config, grid } = panel;
    const authoringNote = getAuthoringNote(panel);
    return {
      id,
      type,
      ...(typeof config.type === 'string' ? { chartType: config.type } : {}),
      ...(typeof config.title === 'string' ? { title: config.title } : {}),
      ...(authoringNote ? { authoringNote } : {}),
      grid,
      isNew: !originalPanelIds.has(id),
      contentChanged: editedPanelIds.has(id),
    };
  };

  const toLayoutPanels = (panels: AttachmentPanel[]): LayoutPanel[] =>
    [...panels].sort(byReadingOrder).map(toLayoutPanel);

  const request: LayoutRequest = {
    dashboardTitle: dashboardData.title,
    ...(dashboardData.description ? { dashboardDescription: dashboardData.description } : {}),
    ...(instructions !== undefined ? { instructions } : {}),
    panels: toLayoutPanels(
      dashboardData.panels.filter((widget): widget is AttachmentPanel => !isSection(widget))
    ),
    sections: dashboardData.panels.filter(isSection).map((section) => ({
      id: section.id,
      title: section.title,
      y: section.grid.y,
      isNew: !originalSectionIds.has(section.id),
      panels: toLayoutPanels(section.panels),
    })),
  };

  const result = await requestArrangement(arrangeLayout, request);
  if ('arrangement' in result) {
    return applyArrangement(dashboardData, result.arrangement);
  }

  logger.warn(`Dashboard layout kept the current layout: ${result.error}`);
  reportUnappliedRequest(result.error);
  return dashboardData;
};

const byReadingOrder = (a: AttachmentPanel, b: AttachmentPanel): number =>
  a.grid.y - b.grid.y || a.grid.x - b.grid.x;

const requestArrangement = async (
  arrangeLayout: ArrangeDashboardLayout,
  request: LayoutRequest
): Promise<{ arrangement: LayoutArrangement } | { error: string }> => {
  try {
    const result = layoutArrangementSchema.safeParse(await arrangeLayout(request));
    if (!result.success) {
      return { error: `invalid arrangement: ${result.error.message}` };
    }
    const issue = getIncompleteArrangementIssue(request, result.data);
    return issue ? { error: `incomplete arrangement: ${issue}` } : { arrangement: result.data };
  } catch (error) {
    return { error: `layout call failed: ${getErrorMessage(error)}` };
  }
};

/**
 * Applying only part of an arrangement mixes the old and the new layout, so an arrangement that
 * misses a panel or section, or overflows the grid, is rejected as a whole.
 */
const getIncompleteArrangementIssue = (
  { panels, sections }: LayoutRequest,
  arrangement: LayoutArrangement
): string | undefined => {
  const overflowingPanel = arrangement.panels.find(({ x, w }) => x + w > GRID_COLUMNS);
  if (overflowingPanel) {
    return `panel "${overflowingPanel.id}" overflows the ${GRID_COLUMNS}-column grid`;
  }

  const arrangedPanelIds = new Set(arrangement.panels.map(({ id }) => id));
  const missingPanel = [...panels, ...sections.flatMap((section) => section.panels)].find(
    ({ id }) => !arrangedPanelIds.has(id)
  );
  if (missingPanel) {
    return `panel "${missingPanel.id}" is missing`;
  }

  const arrangedSectionIds = new Set(arrangement.sections.map(({ id }) => id));
  const missingSection = sections.find(({ id }) => !arrangedSectionIds.has(id));
  return missingSection ? `section "${missingSection.id}" is missing` : undefined;
};

/**
 * Writes only grids, within the bounds of `layoutArrangementSchema`, which are stricter than the
 * dashboard schema. So the arranged dashboard needs no second validation.
 */
const applyArrangement = (
  dashboardData: DashboardAttachmentData,
  { panels, sections }: LayoutArrangement
): DashboardAttachmentData => {
  const gridByPanelId = new Map(panels.map(({ id, ...grid }) => [id, grid]));
  const sectionYById = new Map(sections.map(({ id, y }) => [id, y]));
  const placePanel = (panel: AttachmentPanel): AttachmentPanel => ({
    ...panel,
    grid: gridByPanelId.get(panel.id) ?? panel.grid,
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

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
  type Relayout,
} from './types';

const countLines = (content: string): number =>
  content.split('\n').filter((line) => line.trim() !== '').length;

/** The text size of a markdown panel, which its height depends on. */
const describeMarkdownText = (content: string): string =>
  `Markdown text of ${content.length} characters in ${countLines(content)} lines.`;

/**
 * What the size of a panel depends on: its chart type, or the rough text size of a markdown panel,
 * so that small text edits keep the height.
 */
const getSizeSignature = ({ type, config }: AttachmentPanel): string =>
  type === MARKDOWN_EMBEDDABLE_TYPE && typeof config.content === 'string'
    ? `${type}:${countLines(config.content)}:${Math.round(config.content.length / 200)}`
    : `${type}:${typeof config.type === 'string' ? config.type : ''}`;

interface PlacedPanel {
  panel: AttachmentPanel;
  /** The section id, or null for a top-level panel. */
  containerId: string | null;
}

const getPlacedPanels = (widgets: DashboardAttachmentData['panels']): PlacedPanel[] =>
  widgets.flatMap((widget) =>
    isSection(widget)
      ? widget.panels.map((panel): PlacedPanel => ({ panel, containerId: widget.id }))
      : [{ panel: widget, containerId: null }]
  );

const getSectionIds = (widgets: DashboardAttachmentData['panels']): string[] =>
  widgets.filter(isSection).map(({ id }) => id);

interface ArrangeLayoutParams {
  /** Panels and sections before this call; empty for a new dashboard. */
  originalPanels: DashboardAttachmentData['panels'];
  dashboardData: DashboardAttachmentData;
  panelAuthoringNotes: readonly PanelAuthoringNote[];
  /** The user's own arrangement or size request. */
  instructions?: string;
  arrangeLayout: ArrangeDashboardLayout;
  reportFailure: (failure: OperationFailure) => void;
  logger: Logger;
}

/**
 * Sets the grid of every panel and section with the injected `arrangeLayout` model call, when the
 * user asked for a layout change or a change since `originalPanels` affects the layout: a panel or
 * section was added or removed, a panel moved to another container, or its chart type or markdown
 * text size changed. Other edits, such as colors or queries, keep the layout without a model call.
 * When the call fails, the dashboard keeps its current layout, and a failure is reported if the user
 * asked for a layout change.
 */
export const arrangeDashboardLayout = async ({
  originalPanels,
  dashboardData,
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

  const originalPanelsById = new Map(
    getPlacedPanels(originalPanels).map((placedPanel) => [placedPanel.panel.id, placedPanel])
  );
  const authoringNotesByPanelId = new Map(
    panelAuthoringNotes.map(({ panelId, authoringNote }) => [panelId, authoringNote])
  );

  const getAuthoringNote = ({ id, type, config }: AttachmentPanel): string | undefined =>
    authoringNotesByPanelId.get(id) ??
    (type === MARKDOWN_EMBEDDABLE_TYPE && typeof config.content === 'string'
      ? describeMarkdownText(config.content)
      : undefined);

  const getRelayout = ({ panel, containerId }: PlacedPanel): Relayout | undefined => {
    const original = originalPanelsById.get(panel.id);
    if (!original) {
      return 'all';
    }
    const isMoved = original.containerId !== containerId;
    const isResized = getSizeSignature(original.panel) !== getSizeSignature(panel);
    if (isMoved) {
      return isResized ? 'all' : 'position';
    }
    return isResized ? 'size' : undefined;
  };

  const placedPanels = getPlacedPanels(dashboardData.panels);
  const panelIds = new Set(placedPanels.map(({ panel }) => panel.id));
  const sectionIds = getSectionIds(dashboardData.panels);
  const originalSectionIds = getSectionIds(originalPanels);
  const hasLayoutChange =
    placedPanels.some((placedPanel) => getRelayout(placedPanel) !== undefined) ||
    [...originalPanelsById.keys()].some((id) => !panelIds.has(id)) ||
    sectionIds.length !== originalSectionIds.length ||
    sectionIds.some((id) => !originalSectionIds.includes(id));
  if (instructions === undefined && !hasLayoutChange) {
    return dashboardData;
  }

  const toLayoutPanel = (panel: AttachmentPanel, containerId: string | null): LayoutPanel => {
    const { id, type, config, grid } = panel;
    const authoringNote = getAuthoringNote(panel);
    const relayout = getRelayout({ panel, containerId });
    return {
      id,
      type,
      ...(typeof config.type === 'string' ? { chartType: config.type } : {}),
      ...(typeof config.title === 'string' ? { title: config.title } : {}),
      ...(authoringNote ? { authoringNote } : {}),
      grid,
      ...(relayout ? { relayout } : {}),
    };
  };

  const toLayoutPanels = (panels: AttachmentPanel[], containerId: string | null): LayoutPanel[] =>
    [...panels].sort(byReadingOrder).map((panel) => toLayoutPanel(panel, containerId));

  const request: LayoutRequest = {
    ...(instructions !== undefined ? { instructions } : {}),
    panels: toLayoutPanels(
      dashboardData.panels.filter((widget): widget is AttachmentPanel => !isSection(widget)),
      null
    ),
    sections: dashboardData.panels.filter(isSection).map((section) => ({
      id: section.id,
      title: section.title,
      y: section.grid.y,
      panels: toLayoutPanels(section.panels, section.id),
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

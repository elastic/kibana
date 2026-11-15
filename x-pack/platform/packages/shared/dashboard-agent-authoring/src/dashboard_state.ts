/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentPanel,
  DashboardAttachmentData,
  DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import { isSection } from '@kbn/agent-builder-dashboards-common';
import { DASHBOARD_GRID_COLUMN_COUNT } from '@kbn/as-code-dashboard-schema';

type DashboardWidget = AttachmentPanel | DashboardSection;

export const indexPanelsById = (
  widgets: DashboardAttachmentData['panels']
): Map<string, AttachmentPanel> => {
  const index = new Map<string, AttachmentPanel>();
  for (const widget of widgets) {
    if (isSection(widget)) {
      for (const sectionPanel of widget.panels) {
        index.set(sectionPanel.id, sectionPanel);
      }
      continue;
    }

    index.set(widget.id, widget);
  }
  return index;
};

/**
 * Returns the lowest occupied y-position across top-level panels and section contents.
 */
export const getWidgetsBottomY = (widgets: DashboardWidget[]): number => {
  return widgets.reduce((maxY, widget) => {
    if (isSection(widget)) {
      const sectionBottom = widget.panels.reduce(
        (sectionMaxY, panel) => Math.max(sectionMaxY, widget.grid.y + panel.grid.y + panel.grid.h),
        widget.grid.y + 1
      );
      return Math.max(maxY, sectionBottom);
    }

    return Math.max(maxY, widget.grid.y + widget.grid.h);
  }, 0);
};

export const getSectionsById = ({
  panels,
}: DashboardAttachmentData): Map<string, DashboardSection> =>
  new Map(panels.filter(isSection).map((section) => [section.id, section]));

/** Section id of every panel, or null for panels at the top level. */
export const getSectionIdByPanelId = ({
  panels,
}: DashboardAttachmentData): Map<string, string | null> =>
  new Map(
    panels.flatMap(
      (widget): Array<[string, string | null]> =>
        isSection(widget) ? widget.panels.map(({ id }) => [id, widget.id]) : [[widget.id, null]]
    )
  );

type DashboardControl = NonNullable<DashboardAttachmentData['pinned_panels']>[number];

export const getControlId = ({ id }: DashboardControl): string | undefined =>
  typeof id === 'string' ? id : undefined;

export interface DashboardIndex {
  panelsById: Map<string, AttachmentPanel>;
  sectionsById: Map<string, DashboardSection>;
  /** Section id of every panel, or null for panels at the top level. */
  sectionIdByPanelId: Map<string, string | null>;
  controlsById: Map<string, DashboardControl>;
}

/** Indexes the panels, sections and controls of a dashboard by id. */
export const indexDashboard = (dashboardData: DashboardAttachmentData): DashboardIndex => ({
  panelsById: indexPanelsById(dashboardData.panels),
  sectionsById: getSectionsById(dashboardData),
  sectionIdByPanelId: getSectionIdByPanelId(dashboardData),
  controlsById: new Map(
    (dashboardData.pinned_panels ?? []).flatMap((control) => {
      const id = getControlId(control);
      return id === undefined ? [] : [[id, control] as const];
    })
  ),
});

/** Every panel, section and control id of an indexed dashboard. */
export const getIndexedIds = ({
  panelsById,
  sectionsById,
  controlsById,
}: DashboardIndex): string[] => [
  ...panelsById.keys(),
  ...sectionsById.keys(),
  ...controlsById.keys(),
];

/** Height of a new panel until the layout call places it. */
const PLACEHOLDER_HEIGHT = 10;

/**
 * Returns the grid of a panel until the layout call places it: below the existing widgets of its
 * container, full width unless a size is given.
 */
export const getPlaceholderGrid = (
  widgets: DashboardWidget[],
  { w, h }: Pick<AttachmentPanel['grid'], 'w' | 'h'> = {
    w: DASHBOARD_GRID_COLUMN_COUNT,
    h: PLACEHOLDER_HEIGHT,
  }
): AttachmentPanel['grid'] => ({ x: 0, y: getWidgetsBottomY(widgets), w, h });

export const findSectionIndex = (panels: DashboardWidget[], sectionId: string): number => {
  return panels.findIndex((widget) => isSection(widget) && widget.id === sectionId);
};

/** Returns the widgets of a section, or of the top-level grid when no section is given. */
export const getContainerWidgets = (
  { panels }: DashboardAttachmentData,
  sectionId?: string
): DashboardWidget[] => {
  const section = panels.find(
    (widget): widget is DashboardSection => isSection(widget) && widget.id === sectionId
  );
  return section ? section.panels : panels;
};

export const appendPanelsToDashboard = ({
  dashboardData,
  panelsToAdd,
  sectionId,
}: {
  dashboardData: DashboardAttachmentData;
  panelsToAdd: AttachmentPanel[];
  sectionId?: string;
}): DashboardAttachmentData => {
  if (panelsToAdd.length === 0) {
    return dashboardData;
  }

  if (!sectionId) {
    return {
      ...dashboardData,
      panels: [...dashboardData.panels, ...panelsToAdd],
    };
  }

  const sectionIndex = findSectionIndex(dashboardData.panels, sectionId);
  if (sectionIndex === -1) {
    throw new Error(`Section "${sectionId}" not found.`);
  }

  return {
    ...dashboardData,
    panels: dashboardData.panels.map((widget) => {
      if (!isSection(widget) || widget.id !== sectionId) {
        return widget;
      }

      return {
        ...widget,
        panels: [...widget.panels, ...panelsToAdd],
      };
    }),
  };
};

/**
 * Immutably updates a panel by id whether it lives at the top level or inside a section.
 */
export const updatePanelInDashboard = ({
  dashboardData,
  panelId,
  transformPanel,
}: {
  dashboardData: DashboardAttachmentData;
  panelId: string;
  transformPanel: (panel: AttachmentPanel) => AttachmentPanel;
}): DashboardAttachmentData => ({
  ...dashboardData,
  panels: dashboardData.panels.map((widget) => {
    if (isSection(widget)) {
      return widget.panels.some((panel) => panel.id === panelId)
        ? {
            ...widget,
            panels: widget.panels.map((panel) =>
              panel.id === panelId ? transformPanel(panel) : panel
            ),
          }
        : widget;
    }
    return widget.id === panelId ? transformPanel(widget) : widget;
  }),
});

export const removePanelsFromDashboard = ({
  dashboardData,
  panelIdsToRemove,
}: {
  dashboardData: DashboardAttachmentData;
  panelIdsToRemove: string[];
}): {
  dashboardData: DashboardAttachmentData;
  removedPanels: AttachmentPanel[];
} => {
  const panelIdsToRemoveSet = new Set(panelIdsToRemove);
  const removedPanels: AttachmentPanel[] = [];
  const nextPanels: DashboardWidget[] = [];

  for (const widget of dashboardData.panels) {
    if (isSection(widget)) {
      const sectionPanelsToKeep: AttachmentPanel[] = [];
      for (const panel of widget.panels) {
        if (panelIdsToRemoveSet.has(panel.id)) {
          removedPanels.push(panel);
        } else {
          sectionPanelsToKeep.push(panel);
        }
      }
      nextPanels.push({ ...widget, panels: sectionPanelsToKeep });
      continue;
    }

    if (panelIdsToRemoveSet.has(widget.id)) {
      removedPanels.push(widget);
    } else {
      nextPanels.push(widget);
    }
  }

  return {
    dashboardData: {
      ...dashboardData,
      panels: nextPanels,
    },
    removedPanels,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';

export interface DerivedLayout {
  rows: string[][];
  sections: Array<{ ref: string; rows: string[][] }>;
}

export interface GridLayoutSnapshot {
  panels: Record<string, AttachmentPanel['grid']>;
  sections: Record<string, { y: number }>;
}

const groupPanelIdsByY = (panels: AttachmentPanel[]): string[][] => {
  const sorted = [...panels].sort((a, b) => a.grid.y - b.grid.y || a.grid.x - b.grid.x);
  const rows: string[][] = [];
  let currentY: number | undefined;
  let current: string[] = [];

  for (const panel of sorted) {
    if (currentY === undefined || panel.grid.y !== currentY) {
      if (current.length > 0) {
        rows.push(current);
      }
      current = [panel.id];
      currentY = panel.grid.y;
    } else {
      current.push(panel.id);
    }
  }

  if (current.length > 0) {
    rows.push(current);
  }
  return rows;
};

export const deriveRowsFromGrid = (dashboard: DashboardAttachmentData): DerivedLayout => {
  const topPanels: AttachmentPanel[] = [];
  const sections: DerivedLayout['sections'] = [];

  for (const widget of dashboard.panels) {
    if (isSection(widget)) {
      sections.push({ ref: widget.id, rows: groupPanelIdsByY(widget.panels) });
    } else {
      topPanels.push(widget);
    }
  }

  sections.sort((a, b) => {
    const sectionA = dashboard.panels.find((widget) => isSection(widget) && widget.id === a.ref);
    const sectionB = dashboard.panels.find((widget) => isSection(widget) && widget.id === b.ref);
    const yA = sectionA && isSection(sectionA) ? sectionA.grid.y : 0;
    const yB = sectionB && isSection(sectionB) ? sectionB.grid.y : 0;
    return yA - yB;
  });

  return {
    rows: groupPanelIdsByY(topPanels),
    sections,
  };
};

export const getOrderedLayout = deriveRowsFromGrid;

export const getGridLayout = (dashboard: DashboardAttachmentData): GridLayoutSnapshot => {
  const panels: Record<string, AttachmentPanel['grid']> = {};
  const sections: Record<string, { y: number }> = {};

  for (const widget of dashboard.panels) {
    if (isSection(widget)) {
      sections[widget.id] = { y: widget.grid.y };
      for (const panel of widget.panels) {
        panels[panel.id] = panel.grid;
      }
    } else {
      panels[widget.id] = widget.grid;
    }
  }

  return { panels, sections };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSection,
  type DashboardAttachmentData,
  type AttachmentPanel,
} from '@kbn/agent-builder-dashboards-common';

export interface PanelCatalogEntry {
  id: string;
  type: string;
  title?: string;
  grid: AttachmentPanel['grid'];
  section_id?: string;
}

const panelTitle = (panel: AttachmentPanel): string | undefined => {
  const title = panel.config.title;
  return typeof title === 'string' && title.length > 0 ? title : undefined;
};

const toEntry = (panel: AttachmentPanel, sectionId?: string): PanelCatalogEntry => ({
  id: panel.id,
  type: panel.type,
  title: panelTitle(panel),
  grid: panel.grid,
  ...(sectionId ? { section_id: sectionId } : {}),
});

/**
 * Compact panel list for Panel Review: ids, titles, and grid so findings can name panels.
 */
export const catalogDashboardPanels = (data: DashboardAttachmentData): PanelCatalogEntry[] => {
  const entries: PanelCatalogEntry[] = [];
  for (const widget of data.panels) {
    if (isSection(widget)) {
      for (const panel of widget.panels) {
        entries.push(toEntry(panel, widget.id));
      }
    } else {
      entries.push(toEntry(widget));
    }
  }
  return entries;
};

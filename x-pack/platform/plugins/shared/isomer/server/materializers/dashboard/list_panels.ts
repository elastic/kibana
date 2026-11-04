/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { MaterializeInput } from '../../../common';
import type { DashboardConfig, DashboardPanelConfig } from './config';
import { isDashboardSection } from './config';
import { sectionKey } from './controls';
import {
  CONTROL_PANEL_TYPES,
  panelDescription,
  panelHidesTitle,
  panelInput,
  panelTitle,
} from './panel_types';

/** A dashboard panel, from its as-code state or recovered, with what its grid panel shows. */
export interface ListedPanel {
  id?: string;
  type: string;
  grid: DashboardPanelConfig['grid'];
  config: Record<string, unknown>;
  /** The section's key when the panel is in one: its ID, or its place among sections. */
  sectionId?: string;
  /** What the panel is called, shown or not: its own title, else its saved object's. */
  label?: string;
  /** The header's title and description; absent when the header is hidden or the title is empty. */
  title?: string;
  description?: string;
  /** What to materialize, or why the panel can't be, with no request. */
  target: { input: MaterializeInput } | { reason: string };
}

/** A section of the grid, with its panels. */
export interface ListedSection {
  id?: string;
  key: string;
  title: string;
  collapsed: boolean;
  y: number;
  panels: ListedPanel[];
}

export interface ListedDashboard {
  panels: ListedPanel[];
  sections: ListedSection[];
}

const controlReason = () =>
  i18n.translate('xpack.isomer.materialize.dashboard.controlPanel', {
    defaultMessage: 'Controls cannot be shown here. Their selections apply to the other panels.',
  });

const noAsCodeReason = (type: string) =>
  i18n.translate('xpack.isomer.materialize.dashboard.noAsCodeConfig', {
    defaultMessage: 'Kibana cannot materialize "{type}" panels stored inside a dashboard.',
    values: { type },
  });

const headerFor = (
  hidePanelTitles: boolean,
  config: Record<string, unknown>,
  label: string | undefined
): Pick<ListedPanel, 'title' | 'description'> => {
  if (hidePanelTitles || panelHidesTitle(config) || !label) {
    return {};
  }
  const description = panelDescription(config);
  return { title: label, ...(description ? { description } : {}) };
};

/**
 * Every panel of a dashboard, in the order of its state, with recovered panels after the others
 * in their section. Plan and map list panels the same way, so a panel's place in this list pairs
 * it with its node.
 */
export const listDashboard = ({
  state,
  droppedPanels,
  savedTitles,
}: DashboardConfig): ListedDashboard => {
  const hidePanelTitles = state.options?.hide_panel_titles === true;

  const fromState = (
    { id, type, grid, config }: DashboardPanelConfig,
    sectionId?: string
  ): ListedPanel => {
    const label = panelTitle(config) ?? (id ? savedTitles[id] : undefined);
    return {
      ...(id ? { id } : {}),
      type,
      grid,
      config,
      ...(sectionId ? { sectionId } : {}),
      ...(label ? { label } : {}),
      ...headerFor(hidePanelTitles, config, label),
      target: CONTROL_PANEL_TYPES.has(type)
        ? { reason: controlReason() }
        : { input: panelInput(type, config) },
    };
  };

  const panels: ListedPanel[] = [];
  const sections: ListedSection[] = [];
  let sectionIndex = 0;
  for (const panel of state.panels) {
    if (isDashboardSection(panel)) {
      const key = sectionKey(panel.id, sectionIndex++);
      sections.push({
        ...(panel.id ? { id: panel.id } : {}),
        key,
        title: panel.title,
        collapsed: panel.collapsed,
        y: panel.grid.y,
        panels: panel.panels.map((sectionPanel) => fromState(sectionPanel, key)),
      });
    } else {
      panels.push(fromState(panel));
    }
  }

  for (const dropped of droppedPanels) {
    const config = {
      ...(dropped.title !== undefined ? { title: dropped.title } : {}),
      ...(dropped.hideTitle ? { hide_title: true } : {}),
    };
    const label = dropped.title || savedTitles[dropped.id];
    const section = dropped.sectionId
      ? sections.find(({ id }) => id === dropped.sectionId)
      : undefined;
    const listed: ListedPanel = {
      id: dropped.id,
      type: dropped.type,
      grid: dropped.grid,
      config,
      ...(section ? { sectionId: section.key } : {}),
      ...(label ? { label } : {}),
      ...headerFor(hidePanelTitles, config, label),
      target: dropped.savedObject
        ? { input: { type: dropped.savedObject.type, id: dropped.savedObject.id } }
        : dropped.markdown !== undefined
        ? { input: { type: 'markdown', config: { content: dropped.markdown } } }
        : { reason: noAsCodeReason(dropped.type) },
    };
    (section?.panels ?? panels).push(listed);
  }

  return { panels, sections };
};

/** Every listed panel, top-level ones first, then each section's, in list order. */
export const allPanels = ({ panels, sections }: ListedDashboard): ListedPanel[] => [
  ...panels,
  ...sections.flatMap((section) => section.panels),
];

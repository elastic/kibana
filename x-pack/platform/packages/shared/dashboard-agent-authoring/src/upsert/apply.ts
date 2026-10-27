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
  type DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import {
  appendPanelsToDashboard,
  getContainerWidgets,
  getControlId,
  getPlaceholderGrid,
  getWidgetsBottomY,
  removePanelsFromDashboard,
  updatePanelInDashboard,
} from '../dashboard_state';
import { applyControls } from '../controls';
import type { DashboardMetadata, NewSection, PlannedRemovals, UpsertPlan } from './plan';
import type { ResolvedChanges, ResolvedPanel } from './resolve';
import type { UpsertSectionItem } from './schema';

const applyMetadata = (
  dashboardData: DashboardAttachmentData,
  { title, description, time_range: timeRange }: DashboardMetadata
): DashboardAttachmentData => ({
  ...dashboardData,
  ...(title !== undefined ? { title } : {}),
  ...(description !== undefined ? { description } : {}),
  ...(timeRange !== undefined ? { time_range: timeRange } : {}),
});

const updateSections = (
  dashboardData: DashboardAttachmentData,
  sectionUpdates: UpsertSectionItem[]
): DashboardAttachmentData => ({
  ...dashboardData,
  panels: dashboardData.panels.map((widget) => {
    const update = isSection(widget) && sectionUpdates.find(({ id }) => id === widget.id);
    if (!update) {
      return widget;
    }
    const { title, collapsed } = update;
    return {
      ...widget,
      ...(title !== undefined ? { title } : {}),
      ...(collapsed !== undefined ? { collapsed } : {}),
    };
  }),
});

const addSections = (
  dashboardData: DashboardAttachmentData,
  newSections: NewSection[]
): DashboardAttachmentData =>
  newSections.reduce((nextDashboardData, { id, title, collapsed = false }) => {
    const section: DashboardSection = {
      id,
      title,
      collapsed,
      grid: { y: getWidgetsBottomY(nextDashboardData.panels) },
      panels: [],
    };
    return { ...nextDashboardData, panels: [...nextDashboardData.panels, section] };
  }, dashboardData);

/** Adds a new panel to its target, or updates an existing one and moves it when it has a target. */
const applyPanel = (
  dashboardData: DashboardAttachmentData,
  panel: ResolvedPanel
): DashboardAttachmentData => {
  if (!panel.existingPanel) {
    const { id, target, content } = panel;
    const sectionId = target ?? undefined;
    const grid = getPlaceholderGrid(getContainerWidgets(dashboardData, sectionId));
    return appendPanelsToDashboard({
      dashboardData,
      panelsToAdd: [{ id, ...content, grid }],
      sectionId,
    });
  }

  const { id, target, content } = panel;
  const transformPanel = (existingPanel: AttachmentPanel): AttachmentPanel => ({
    ...existingPanel,
    ...content,
  });

  if (target === undefined) {
    return updatePanelInDashboard({ dashboardData, panelId: id, transformPanel });
  }

  const { dashboardData: withoutPanel, removedPanels } = removePanelsFromDashboard({
    dashboardData,
    panelIdsToRemove: [id],
  });
  const sectionId = target ?? undefined;
  const targetWidgets = getContainerWidgets(withoutPanel, sectionId);
  return appendPanelsToDashboard({
    dashboardData: withoutPanel,
    panelsToAdd: removedPanels.map((removedPanel) => ({
      ...transformPanel(removedPanel),
      grid: getPlaceholderGrid(targetWidgets, removedPanel.grid),
    })),
    sectionId,
  });
};

const applyRemovals = (
  dashboardData: DashboardAttachmentData,
  { panelIds, sectionIds, controlIds }: PlannedRemovals
): DashboardAttachmentData => {
  const { dashboardData: withoutPanels } = removePanelsFromDashboard({
    dashboardData,
    panelIdsToRemove: [...panelIds],
  });

  return {
    ...withoutPanels,
    panels: withoutPanels.panels.filter(
      (widget) => !isSection(widget) || !sectionIds.has(widget.id)
    ),
    ...(controlIds.size > 0
      ? {
          pinned_panels: (withoutPanels.pinned_panels ?? []).filter(
            (control) => !controlIds.has(getControlId(control) ?? '')
          ),
        }
      : {}),
  };
};

/** The planned changes, with the panels and controls that resolved. */
type ApplicableChanges = Pick<
  UpsertPlan,
  'metadata' | 'sectionUpdates' | 'newSections' | 'removals'
> &
  Pick<ResolvedChanges, 'panels' | 'controls'>;

/**
 * Applies the changes to the original dashboard. Panels are applied before removals so a panel
 * moved out of a removed section survives.
 */
export const applyPlan = ({
  dashboardData,
  changes: { metadata, sectionUpdates, newSections, panels, removals, controls },
}: {
  dashboardData: DashboardAttachmentData;
  changes: ApplicableChanges;
}): DashboardAttachmentData => {
  let nextDashboardData = applyMetadata(dashboardData, metadata);
  nextDashboardData = updateSections(nextDashboardData, sectionUpdates);
  nextDashboardData = addSections(nextDashboardData, newSections);
  nextDashboardData = panels.reduce(applyPanel, nextDashboardData);
  nextDashboardData = applyRemovals(nextDashboardData, removals);
  return applyControls({ dashboardData: nextDashboardData, controls });
};

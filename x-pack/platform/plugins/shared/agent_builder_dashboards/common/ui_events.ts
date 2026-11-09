/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel, DashboardAttachment } from '@kbn/agent-builder-dashboards-common';

/**
 * Tool UI event sent when an agent tool creates or updates a dashboard attachment,
 * so the open dashboard app can apply the change while the run is still in progress.
 */
export const DASHBOARD_UPDATED_UI_EVENT = 'dashboard:updated';

export interface DashboardUpdatedUiEventData {
  attachment: DashboardAttachment;
}

/**
 * Tool UI events that let the open dashboard app show a dashboard being built: a skeleton per
 * panel as soon as the plan is known, each swapped for its real panel as the panel resolves.
 * `dashboard:updated` still carries the final dashboard and always wins.
 */
export const DASHBOARD_BUILD_STARTED_UI_EVENT = 'dashboard:build_started';
export const DASHBOARD_PANEL_RESOLVED_UI_EVENT = 'dashboard:panel_resolved';
export const DASHBOARD_BUILD_ENDED_UI_EVENT = 'dashboard:build_ended';

export interface DashboardBuildPlannedPanel {
  id: string;
  /** What the panel was asked to show, until it resolves to a real title. */
  label: string;
  /** The kind of chart the panel will be, when known, to size its skeleton. */
  chartType?: string;
}

export interface DashboardBuildStartedUiEventData {
  attachmentId: string;
  title: string;
  panels: DashboardBuildPlannedPanel[];
}

export interface DashboardPanelResolvedUiEventData {
  attachmentId: string;
  panelId: string;
  /** The resolved panel, or `undefined` when it failed and its skeleton should go away. */
  panel?: Pick<AttachmentPanel, 'type' | 'config'>;
}

export interface DashboardBuildEndedUiEventData {
  attachmentId: string;
}

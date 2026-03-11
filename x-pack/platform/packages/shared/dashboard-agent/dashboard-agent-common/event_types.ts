/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolUiEvent } from '@kbn/agent-builder-common/chat';
import type { DASHBOARD_PANEL_ADDED_EVENT, DASHBOARD_PANELS_REMOVED_EVENT } from './constants';
import type { AttachmentPanel } from './panel_types';

/**
 * Data payload for a panel added event.
 */
export interface PanelAddedEventData {
  dashboardAttachmentId: string;
  panel: AttachmentPanel;
}

/**
 * Data payload for a panel removed event.
 */
export interface PanelsRemovedEventData {
  dashboardAttachmentId: string;
  panelIds: string[];
}

/**
 * Union type for dashboard UI events.
 */
export type DashboardUiEvent =
  | ToolUiEvent<typeof DASHBOARD_PANEL_ADDED_EVENT, PanelAddedEventData>
  | ToolUiEvent<typeof DASHBOARD_PANELS_REMOVED_EVENT, PanelsRemovedEventData>;

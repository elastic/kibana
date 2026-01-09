/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Full panel configuration as passed to the agent.
 * This includes all the configuration details that allow the agent
 * to understand what the visualization shows.
 */
export interface DashboardAttachmentPanel {
  /** The embeddable type (e.g., 'lens', 'visualization', 'map') */
  type: string;
  /** The panel's unique identifier within the dashboard */
  uid?: string;
  /** The full panel configuration */
  config: Record<string, unknown>;
}

/**
 * Section information for dashboard sections
 */
export interface DashboardAttachmentSection {
  title: string;
  panels: DashboardAttachmentPanel[];
}

/**
 * Data for a dashboard attachment.
 * This is the data structure passed to the agent when a dashboard is attached.
 */
export interface DashboardAttachmentData {
  /** The saved object ID of the dashboard (undefined for unsaved dashboards) */
  dashboardId?: string;
  /** The dashboard title */
  title: string;
  /** Optional dashboard description */
  description?: string;
  /** Total number of panels in the dashboard */
  panelCount: number;
  /** Top-level panels (not in sections) */
  panels?: DashboardAttachmentPanel[];
  /** Dashboard sections with their panels */
  sections?: DashboardAttachmentSection[];
  /** Label to display for the attachment in the UI */
  attachmentLabel?: string;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Summary information for a dashboard panel
 */
export interface PanelSummary {
  type: string;
  title?: string;
}

/**
 * Data for a dashboard attachment.
 */
export interface DashboardAttachmentData {
  dashboardId: string;
  title: string;
  description?: string;
  panelCount: number;
  panels?: PanelSummary[];
}

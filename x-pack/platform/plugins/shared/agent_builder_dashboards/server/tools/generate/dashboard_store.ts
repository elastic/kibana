/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { ResolveAttachmentPanel } from '@kbn/dashboard-agent-authoring';

export type DashboardReference =
  | { attachment_id: string; version: number }
  | { dashboard_id: string; url: string };

export interface LoadedDashboard {
  /** Id that saves overwrite. A saved-object read can resolve the requested id to an alias target. */
  id: string;
  data: DashboardAttachmentData;
  reference: DashboardReference;
}

export interface DashboardStore {
  load: (dashboardId: string) => Promise<LoadedDashboard>;
  save: (
    data: DashboardAttachmentData,
    existing: LoadedDashboard | undefined
  ) => Promise<DashboardReference>;
  resolveAttachmentPanel: ResolveAttachmentPanel;
}

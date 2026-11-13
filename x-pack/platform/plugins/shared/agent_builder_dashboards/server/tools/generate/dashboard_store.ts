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
  /** Id that `save` writes to. Differs from the requested id when a saved-object read resolves an alias. */
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

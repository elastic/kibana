/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common';

/**
 * Tool UI event sent when an agent tool creates or updates a dashboard attachment,
 * so the open dashboard app can apply the change while the run is still in progress.
 */
export const DASHBOARD_UPDATED_UI_EVENT = 'dashboard:updated';

export interface DashboardUpdatedUiEventData {
  attachment: DashboardAttachment;
}

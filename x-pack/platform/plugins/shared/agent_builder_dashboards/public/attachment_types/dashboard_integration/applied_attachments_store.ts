/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common/types';

export interface AppliedAttachmentBaseline {
  /** Attachment data that was applied to the dashboard. */
  attachmentData: DashboardAttachmentData;
  /** Dashboard state read back as attachment data once the applied panels settled. */
  dashboardData: DashboardAttachmentData;
}

/**
 * Tracks attachments applied to the dashboard app, so the dashboard runtime's own
 * normalization of an applied attachment (key order, panel defaults) is not mistaken
 * for a manual change.
 */
export interface AppliedAttachmentsStore {
  baselines: Map<string, AppliedAttachmentBaseline>;
  pendingApplies: Set<string>;
}

export const createAppliedAttachmentsStore = (): AppliedAttachmentsStore => ({
  baselines: new Map(),
  pendingApplies: new Set(),
});

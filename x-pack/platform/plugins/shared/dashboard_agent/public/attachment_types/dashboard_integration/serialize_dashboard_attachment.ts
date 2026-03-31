/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE, dashboardStateToAttachment } from '@kbn/dashboard-agent-common';
import type { DashboardAttachmentData } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';

/**
 * Serializes the current dashboard state into an attachment input.
 * Returns undefined if the dashboard state cannot be serialized.
 */
export const serializeDashboardAttachment = ({
  api,
  attachmentId,
  origin,
}: {
  api: DashboardApi;
  attachmentId: string;
  origin: string | undefined;
}): AttachmentInput<typeof DASHBOARD_ATTACHMENT_TYPE, DashboardAttachmentData> | undefined => {
  const currentDashboardState = api.getSerializedState().attributes;

  if (!currentDashboardState) {
    return undefined;
  }

  return {
    id: attachmentId,
    type: DASHBOARD_ATTACHMENT_TYPE,
    data: dashboardStateToAttachment(currentDashboardState),
    origin,
  };
};

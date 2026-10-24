/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type {
  DashboardAttachment,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common/types';
import { getDashboardAttachmentData, isAttachmentAppliedToDashboard } from './apply_attachment';
import type { AppliedAttachmentsStore } from './applied_attachments_store';

/**
 * Finds the conversation attachment that stands for the open dashboard, so its changes become
 * versions of that attachment instead of a new one.
 */
export const getLinkedAttachment = ({
  api,
  store,
  attachments = [],
  dashboardData,
}: {
  api: DashboardApi;
  store: AppliedAttachmentsStore;
  attachments: DashboardAttachment[] | undefined;
  dashboardData: DashboardAttachmentData;
}): DashboardAttachment | undefined => {
  const dashboardId = api.savedObjectId$.getValue();
  if (dashboardId) {
    const savedAttachment = attachments.find(({ origin }) => origin === dashboardId);
    if (savedAttachment) {
      return savedAttachment;
    }
  }

  // the dashboard was applied from or staged as this attachment, which may not have an origin yet
  const linkedAttachmentId = store.linkedAttachmentIds.get(api);
  const linkedAttachment = attachments.find(({ id }) => id === linkedAttachmentId);
  if (linkedAttachment) {
    return linkedAttachment;
  }

  // a reloaded or newly opened dashboard that shows an attachment not saved to another dashboard
  const shownAttachment = attachments.find(
    (attachment) =>
      !attachment.origin && isAttachmentAppliedToDashboard({ store, dashboardData, attachment })
  );
  if (shownAttachment) {
    return shownAttachment;
  }

  if (dashboardId) {
    return undefined;
  }
  // an unsaved dashboard can only stand for an attachment without an origin, when there is one
  const unsavedAttachments = attachments.filter(({ origin }) => !origin);
  return unsavedAttachments.length === 1 ? unsavedAttachments[0] : undefined;
};

/**
 * Whether the attachment belongs on the open dashboard: it is the attachment the dashboard is
 * linked to, or the dashboard is a new, empty one with nothing to lose.
 */
export const canShowAttachmentInDashboard = ({
  api,
  store,
  attachment,
}: {
  api: DashboardApi;
  store: AppliedAttachmentsStore;
  attachment: Pick<DashboardAttachment, 'id' | 'origin'>;
}): boolean => {
  if (store.linkedAttachmentIds.get(api) === attachment.id) {
    return true;
  }
  const dashboardId = api.savedObjectId$.getValue();
  if (dashboardId) {
    return attachment.origin === dashboardId;
  }
  const { panels = [], pinned_panels: pinnedPanels = [] } = getDashboardAttachmentData(api);
  return panels.length === 0 && pinnedPanels.length === 0;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import { isAttachmentShownInDashboard, type DashboardSnapshot } from './apply_attachment';
import type { AppliedAttachmentsStore } from './applied_attachments_store';

/**
 * Finds the conversation attachment that stands for the open dashboard, so its changes become
 * versions of that attachment instead of a new one.
 */
export const getLinkedAttachment = ({
  api,
  store,
  attachments = [],
  dashboard,
  draftAttachmentId,
}: {
  api: DashboardApi;
  store: AppliedAttachmentsStore;
  attachments: DashboardAttachment[] | undefined;
  dashboard: DashboardSnapshot;
  draftAttachmentId: string;
}): DashboardAttachment | undefined => {
  const dashboardId = api.savedObjectId$.getValue();
  if (dashboardId) {
    const savedAttachment = attachments.find(({ origin }) => origin === dashboardId);
    if (savedAttachment) {
      return savedAttachment;
    }
  }

  // the dashboard was applied from or staged as this attachment, which may not have an origin yet
  const linkedAttachmentId = store.getLinkedAttachmentId(api);
  const linkedAttachment = attachments.find(({ id }) => id === linkedAttachmentId);
  if (linkedAttachment) {
    return linkedAttachment;
  }

  // a reloaded or newly opened dashboard that shows an attachment not saved to another dashboard
  const shownAttachment = attachments.find(
    ({ origin, data }) => !origin && isAttachmentShownInDashboard(api, dashboard, data)
  );
  if (shownAttachment) {
    return shownAttachment;
  }

  // a dashboard linked to an attachment of another conversation doesn't stand for this one's
  if (dashboardId || store.isLinkedInOtherConversation(api, draftAttachmentId)) {
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
  if (store.getLinkedAttachmentId(api) === attachment.id) {
    return true;
  }
  const dashboardId = api.savedObjectId$.getValue();
  if (dashboardId) {
    return attachment.origin === dashboardId;
  }
  const { panels, pinnedPanels } = api.layout$.getValue();
  return Object.keys(panels).length === 0 && Object.keys(pinnedPanels).length === 0;
};

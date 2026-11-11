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
export const getLinkedAttachment = async ({
  api,
  store,
  attachments,
  dashboard,
  draftAttachmentId,
}: {
  api: DashboardApi;
  store: AppliedAttachmentsStore;
  attachments: DashboardAttachment[];
  dashboard: DashboardSnapshot;
  draftAttachmentId: string;
}): Promise<DashboardAttachment | undefined> => {
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
  const attachmentsWithoutOrigin = attachments.filter(({ origin }) => !origin);
  const shownFlags = await Promise.all(
    attachmentsWithoutOrigin.map(({ data }) => isAttachmentShownInDashboard(api, dashboard, data))
  );
  const shownAttachment = attachmentsWithoutOrigin.find((_, index) => shownFlags[index]);
  if (shownAttachment) {
    return shownAttachment;
  }

  // a dashboard linked to an attachment of another conversation doesn't stand for this one's
  if (dashboardId || store.isLinkedInOtherConversation(api, draftAttachmentId)) {
    return undefined;
  }
  // an unsaved dashboard can only stand for an attachment without an origin, when there is one
  return attachmentsWithoutOrigin.length === 1 ? attachmentsWithoutOrigin[0] : undefined;
};

/** Whether the open dashboard is a new one without panels, so applying an attachment loses nothing. */
export const isNewEmptyDashboard = (api: DashboardApi): boolean => {
  if (api.savedObjectId$.getValue()) {
    return false;
  }
  const { panels, pinnedPanels } = api.layout$.getValue();
  return Object.keys(panels).length === 0 && Object.keys(pinnedPanels).length === 0;
};

/**
 * Whether the attachment belongs on the open dashboard: it is the attachment the dashboard is
 * linked to, or an attachment without a saved dashboard and the dashboard is new and empty.
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
  // linking an unsaved copy of another saved dashboard would move the attachment's origin on save
  return !attachment.origin && isNewEmptyDashboard(api);
};

export type AttachmentTarget = 'apply' | 'open_saved_dashboard' | 'open_new_dashboard';

/**
 * Where an attachment is shown: applied to the open dashboard, or opened as its saved dashboard
 * or as a new unsaved one, so the open dashboard is not overwritten.
 */
export const resolveAttachmentTarget = async ({
  api,
  store,
  attachment,
  checkSavedDashboardExist,
}: {
  api: DashboardApi;
  store: AppliedAttachmentsStore;
  attachment: Pick<DashboardAttachment, 'id' | 'origin'>;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}): Promise<AttachmentTarget> => {
  if (canShowAttachmentInDashboard({ api, store, attachment })) {
    return 'apply';
  }
  if (attachment.origin && (await checkSavedDashboardExist(attachment.origin))) {
    return 'open_saved_dashboard';
  }
  // the attachment's saved dashboard was deleted, so a new, empty dashboard can stand for it
  return isNewEmptyDashboard(api) ? 'apply' : 'open_new_dashboard';
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, ignoreElements, merge, tap, type Observable } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_OPERATION, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { attachmentDataToDashboardState, isDashboardAttachment } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { createManualChanges$ } from './manual_changes_tracker';

export interface DashboardAttachmentMountSyncParams {
  api: DashboardApi;
  chat$: Observable<ChatEvent>;
  getAttachment: () => DashboardAttachment;
  updateOrigin: (origin: string) => Promise<unknown>;
  addAttachment: (attachment: AttachmentInput) => void;
}

export const createDashboardAttachmentMountSync$ = ({
  api,
  chat$,
  getAttachment,
  updateOrigin,
  addAttachment,
}: DashboardAttachmentMountSyncParams): Observable<never> => {
  // Sync attachment origin when dashboard is saved.
  const savedDashboardOriginSync$ = api.onSave$.pipe(
    tap(({ previousDashboardId, dashboardId }) => {
      if (!dashboardId) {
        return;
      }
      const currentAttachment = getAttachment();

      // Only update origin if:
      //    a. The attachment has no origin yet (first save of unsaved dashboard)
      //    b. The attachment already points to this dashboard (second+ save)
      //    c. The saved dashboard was previously the attachment's origin (save / save as)
      const shouldUpdate =
        !currentAttachment.origin ||
        dashboardId === currentAttachment.origin ||
        previousDashboardId === currentAttachment.origin;

      if (shouldUpdate) {
        void updateOrigin(dashboardId);
      }
    }),
    ignoreElements()
  );

  const agentLiveUpdates$ = chat$.pipe(
    filter(isRoundCompleteEvent),
    tap((event) => {
      const updatedVersionedAttachment = event.data.attachments?.find(
        (attachment) =>
          isDashboardAttachment(attachment) &&
          event.data.round.input.attachment_refs?.some(
            (ref) =>
              ref.attachment_id === attachment.id &&
              (ref.operation === ATTACHMENT_REF_OPERATION.updated ||
                ref.operation === ATTACHMENT_REF_OPERATION.created)
          ) === true
      );

      if (!updatedVersionedAttachment || !isDashboardAttachment(updatedVersionedAttachment)) {
        return;
      }

      const currentSavedObjectId = api.savedObjectId$.getValue();
      const attachmentLinkedSavedObjectId = updatedVersionedAttachment.origin;

      // Skip if viewing a saved dashboard that differs from the attachment's linked dashboard
      if (currentSavedObjectId && attachmentLinkedSavedObjectId !== currentSavedObjectId) {
        return;
      }

      const latestVersionData = getLatestVersion(updatedVersionedAttachment)?.data;
      if (!latestVersionData) {
        return;
      }
      api.setState(attachmentDataToDashboardState(latestVersionData));
    }),
    ignoreElements()
  );

  const manualChanges$ = createManualChanges$({
    api,
    getAttachment,
  }).pipe(
    tap((attachment) => {
      addAttachment(attachment);
    }),
    ignoreElements()
  );

  return merge(savedDashboardOriginSync$, agentLiveUpdates$, manualChanges$);
};

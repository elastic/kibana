/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, ignoreElements, merge, tap, type Observable } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { AttachmentInput, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_OPERATION, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE, attachmentToDashboardState } from '@kbn/dashboard-agent-common';
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
        (attachment): attachment is VersionedAttachment<typeof DASHBOARD_ATTACHMENT_TYPE> =>
          attachment.type === DASHBOARD_ATTACHMENT_TYPE &&
          event.data.round.input.attachment_refs?.some(
            (ref) =>
              ref.attachment_id === attachment.id &&
              (ref.operation === ATTACHMENT_REF_OPERATION.updated ||
                ref.operation === ATTACHMENT_REF_OPERATION.created)
          ) === true
      );

      if (!updatedVersionedAttachment) {
        return;
      }

      const currentSavedObjectId = api.savedObjectId$.getValue();
      const attachmentLinkedSavedObjectId = updatedVersionedAttachment.origin;

      // Skip if viewing a saved dashboard that differs from the attachment's linked dashboard
      if (currentSavedObjectId && attachmentLinkedSavedObjectId !== currentSavedObjectId) {
        return;
      }

      const latestVersion = getLatestVersion(updatedVersionedAttachment);
      if (!latestVersion) {
        return;
      }

      const attachment: DashboardAttachment = {
        id: updatedVersionedAttachment.id,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: latestVersion.data as DashboardAttachment['data'], // TODO: fix type
        origin: updatedVersionedAttachment.origin,
      };
      api.setState(attachmentToDashboardState(attachment));
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

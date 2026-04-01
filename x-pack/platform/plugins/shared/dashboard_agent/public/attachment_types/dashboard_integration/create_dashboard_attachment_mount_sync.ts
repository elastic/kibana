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
  let previousSavedObjectId = api.savedObjectId$.value;

  const savedDashboardOriginSync$ = api.savedObjectId$.pipe(
    tap((currentSavedObjectId) => {
      const currentAttachment = getAttachment();
      // Only update origin if:
      // there is an id to update to (currentId is not undefined)
      // the id is different from the current origin (currentId !== currentAttachment.origin)
      // 1. The attachment has no origin yet (unsaved), OR
      // 2. The previous savedObjectId matches the attachment origin (we're on the same dashboard)
      // This prevents linking to unrelated dashboards when navigating

      const shouldUpdate =
        currentSavedObjectId &&
        currentSavedObjectId !== currentAttachment.origin &&
        (!currentAttachment.origin ||
          previousSavedObjectId === currentAttachment.origin ||
          currentSavedObjectId === currentAttachment.origin);
      if (shouldUpdate) {
        void updateOrigin(currentSavedObjectId);
      }
      previousSavedObjectId = currentSavedObjectId;
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
              (ref.attachment_id === attachment.id &&
                ref.operation === ATTACHMENT_REF_OPERATION.updated) ||
              ref.operation === ATTACHMENT_REF_OPERATION.created
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

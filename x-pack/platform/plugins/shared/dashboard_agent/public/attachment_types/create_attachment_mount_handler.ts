/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, type Observable, type Subscription } from 'rxjs';
import type { AttachmentLifecycleParams } from '@kbn/agent-builder-browser/attachments';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { ChatEvent } from '@kbn/agent-builder-common';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_OPERATION, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { getStateFromAttachment } from './attachment_to_dashboard_state';
export interface OnAttachmentMountParams extends AttachmentLifecycleParams<DashboardAttachment> {
  dashboardPlugin: DashboardStart;
  chat$: Observable<ChatEvent>;
}

/**
 * Creates the onAttachmentMount handler for dashboard attachments.
 * This handler manages:
 * - Origin sync: Links attachment to saved dashboard when dashboard is saved
 * - (Future) Manual changes sync
 * - (Future) Live changes sync from chat via agentBuilder.chat$
 */
export const onAttachmentMount = ({
  dashboardPlugin,
  chat$,
  getAttachment,
  updateOrigin,
}: OnAttachmentMountParams) => {
  let savedObjectIdSubscription: Subscription | undefined;
  let liveChangesSubscription: Subscription | undefined;

  // Subscribe to dashboard API changes to manage savedObjectId$ subscription lifecycle
  const apiSubscription = dashboardPlugin.dashboardAppClientApi$.subscribe((api) => {
    savedObjectIdSubscription?.unsubscribe();
    savedObjectIdSubscription = undefined;
    liveChangesSubscription?.unsubscribe();
    liveChangesSubscription = undefined;
    if (!api) return;

    let previousSavedObjectId = api.savedObjectId$.value;

    savedObjectIdSubscription = api.savedObjectId$.subscribe(async (currentSavedObjectId) => {
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
        (!currentAttachment.origin || previousSavedObjectId === currentAttachment.origin);
      if (shouldUpdate) {
        await updateOrigin(currentSavedObjectId);
      }
      previousSavedObjectId = currentSavedObjectId;
    });

    liveChangesSubscription = chat$.pipe(filter(isRoundCompleteEvent)).subscribe((event) => {
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

      // Get the latest version's data
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
      api.setState(getStateFromAttachment(attachment));
      setTimeout(() => api!.scrollToBottom(), 0);
    });
  });

  return () => {
    apiSubscription.unsubscribe();
    savedObjectIdSubscription?.unsubscribe();
    liveChangesSubscription?.unsubscribe();
  };
};

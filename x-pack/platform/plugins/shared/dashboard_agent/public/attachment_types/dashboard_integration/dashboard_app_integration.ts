/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, Observable, tap, ignoreElements, type Subscription } from 'rxjs';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { AttachmentInput, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_OPERATION, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  dashboardStateToAttachment,
  attachmentToDashboardState,
} from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import { createManualChanges$ } from './manual_changes_tracker';

const getCurrentDashboardAttachment = ({
  api,
  attachmentId,
}: {
  api: DashboardApi;
  attachmentId: string;
}): AttachmentInput | undefined => {
  const currentDashboardState = api.getSerializedState().attributes;

  if (!currentDashboardState) {
    return;
  }

  return {
    id: attachmentId,
    type: DASHBOARD_ATTACHMENT_TYPE,
    data: dashboardStateToAttachment(currentDashboardState),
    origin: api.savedObjectId$.getValue(),
  };
};

/**
 * Creates a subscription that syncs the dashboard's saved object ID to the attachment's origin.
 * This ensures that when a dashboard is saved (or saved as), the attachment origin is updated.
 */
const createOriginSyncSubscription = ({
  api,
  conversationId,
  attachmentId,
  attachmentOrigin,
  agentBuilder,
}: {
  api: DashboardApi;
  conversationId: string;
  attachmentId: string;
  attachmentOrigin: string | undefined;
  agentBuilder: AgentBuilderPluginStart;
}): Subscription => {
  let previousSavedObjectId = api.savedObjectId$.value;
  let currentOrigin = attachmentOrigin;

  return api.savedObjectId$.subscribe((currentSavedObjectId) => {
    // Only update origin if:
    // - there is an id to update to (currentSavedObjectId is not undefined)
    // - the id is different from the current origin
    // - Either:
    //   1. The attachment has no origin yet (unsaved), OR
    //   2. The previous savedObjectId matches the attachment origin (we're on the same dashboard), OR
    //   3. The current savedObjectId matches the attachment origin
    // This prevents linking to unrelated dashboards when navigating
    const shouldUpdate =
      currentSavedObjectId &&
      currentSavedObjectId !== currentOrigin &&
      (!currentOrigin ||
        previousSavedObjectId === currentOrigin ||
        currentSavedObjectId === currentOrigin);

    if (shouldUpdate) {
      void agentBuilder.updateAttachmentOrigin(conversationId, attachmentId, currentSavedObjectId);
      currentOrigin = currentSavedObjectId;
    }
    previousSavedObjectId = currentSavedObjectId;
  });
};

export const registerDashboardAppIntegration = ({
  agentBuilder,
  api,
}: {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
}): (() => void) => {
  let pendingDashboardAttachmentId: string | undefined;
  let currentAttachment: DashboardAttachment | undefined;
  let originSyncSubscription: Subscription | undefined;
  let pendingAttachmentOriginSyncSubscription: Subscription | undefined;

  const cleanupOriginSync = () => {
    originSyncSubscription?.unsubscribe();
    originSyncSubscription = undefined;
  };

  const cleanupPendingAttachmentOriginSync = () => {
    pendingAttachmentOriginSyncSubscription?.unsubscribe();
    pendingAttachmentOriginSyncSubscription = undefined;
  };

  const removePendingDashboardAttachment = () => {
    // Only remove the temporary attachment created by this integration.
    // Do not touch attachments added through other flows, such as manual
    // dashboard edits or stale-attachment refreshes.
    if (!pendingDashboardAttachmentId) {
      return;
    }

    cleanupPendingAttachmentOriginSync();
    agentBuilder.removeAttachment(pendingDashboardAttachmentId);
    pendingDashboardAttachmentId = undefined;
    currentAttachment = undefined;
  };

  const setupOriginSyncForExistingAttachment = (
    conversationId: string,
    attachment: VersionedAttachment
  ) => {
    cleanupOriginSync();
    originSyncSubscription = createOriginSyncSubscription({
      api,
      conversationId,
      attachmentId: attachment.id,
      attachmentOrigin: attachment.origin,
      agentBuilder,
    });
  };

  /**
   * Sets up origin sync for pending attachments by re-adding the attachment
   * with the updated origin when the dashboard is saved.
   */
  const setupPendingAttachmentOriginSync = (attachmentId: string, initialOrigin?: string) => {
    cleanupPendingAttachmentOriginSync();

    let previousSavedObjectId = api.savedObjectId$.value;
    let currentOrigin = initialOrigin;

    pendingAttachmentOriginSyncSubscription = api.savedObjectId$.subscribe(
      (currentSavedObjectId) => {
        const shouldUpdate =
          currentSavedObjectId &&
          currentSavedObjectId !== currentOrigin &&
          (!currentOrigin ||
            previousSavedObjectId === currentOrigin ||
            currentSavedObjectId === currentOrigin);

        if (shouldUpdate && pendingDashboardAttachmentId === attachmentId) {
          // Re-add the attachment with updated origin
          const updatedAttachment = getCurrentDashboardAttachment({
            api,
            attachmentId,
          });
          if (updatedAttachment) {
            agentBuilder.addAttachment(updatedAttachment);
            // Update current attachment origin
            if (currentAttachment) {
              currentAttachment = { ...currentAttachment, origin: currentSavedObjectId };
            }
          }
          currentOrigin = currentSavedObjectId;
        }
        previousSavedObjectId = currentSavedObjectId;
      }
    );
  };

  /**
   * Subscribes to chat events and applies LLM-made dashboard changes to the current dashboard.
   * When the agent updates a dashboard attachment, this applies those changes via api.setState().
   */
  const agentLiveUpdatesSubscription = agentBuilder.events.chat$
    .pipe(filter(isRoundCompleteEvent))
    .subscribe((event) => {
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
        data: latestVersion.data as DashboardAttachment['data'],
        origin: updatedVersionedAttachment.origin,
      };
      api.setState(attachmentToDashboardState(attachment));
    });

  /**
   * Tracks manual changes to the dashboard and syncs them back to the attachment.
   * When the user manually edits the dashboard (changes title, adds panels, etc.),
   * this updates the attachment to reflect those changes.
   */
  const manualChangesSubscription = createManualChanges$({
    api,
    getAttachment: () => currentAttachment,
  })
    .pipe(
      tap((attachment) => {
        agentBuilder.addAttachment(attachment);
      }),
      ignoreElements()
    )
    .subscribe();

  agentBuilder.setChatConfig({
    onConversationChange: ({ id: conversationId, attachments }) => {
      // Always clean up origin sync for existing attachments
      cleanupOriginSync();
      // Always remove pending attachment when conversation changes
      // This ensures we don't carry over attachments from previous conversations
      removePendingDashboardAttachment();

      const existingDashboardAttachment = attachments?.find(
        (attachment): attachment is VersionedAttachment<typeof DASHBOARD_ATTACHMENT_TYPE> =>
          attachment.type === DASHBOARD_ATTACHMENT_TYPE
      );

      if (existingDashboardAttachment && conversationId) {
        // Switching to a conversation with existing dashboard attachment
        // Set up sync for existing attachment
        setupOriginSyncForExistingAttachment(conversationId, existingDashboardAttachment);

        // Set current attachment from existing versioned attachment
        const latestVersion = getLatestVersion(existingDashboardAttachment);
        if (latestVersion) {
          currentAttachment = {
            id: existingDashboardAttachment.id,
            type: DASHBOARD_ATTACHMENT_TYPE,
            data: latestVersion.data as DashboardAttachment['data'],
            origin: existingDashboardAttachment.origin,
          };
        }
        return;
      }

      // No existing dashboard attachment - create a new pending attachment
      pendingDashboardAttachmentId = uuidv4();

      const attachment = getCurrentDashboardAttachment({
        api,
        attachmentId: pendingDashboardAttachmentId,
      });
      if (!attachment) {
        return;
      }

      agentBuilder.addAttachment(attachment);
      setupPendingAttachmentOriginSync(pendingDashboardAttachmentId, attachment.origin);

      // Set current attachment for manual changes tracking
      currentAttachment = {
        id: attachment.id,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: attachment.data,
        origin: attachment.origin,
      };
    },
  });

  return () => {
    cleanupOriginSync();
    removePendingDashboardAttachment();
    agentLiveUpdatesSubscription.unsubscribe();
    manualChangesSubscription.unsubscribe();
    agentBuilder.clearChatConfig();
  };
};

export const createDashboardAppIntegration$ = ({
  agentBuilder,
  api,
}: {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
}): Observable<never> =>
  new Observable<never>(() => registerDashboardAppIntegration({ agentBuilder, api }));

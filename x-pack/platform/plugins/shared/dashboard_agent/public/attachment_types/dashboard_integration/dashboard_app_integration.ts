/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, type Subscription } from 'rxjs';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import { createAgentLiveUpdatesSubscription } from './agent_live_updates_subscription';
import { createManualChangesSubscription } from './manual_changes_subscription';
import { serializeDashboardAttachment } from './serialize_dashboard_attachment';

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
  onOriginUpdated,
}: {
  api: DashboardApi;
  conversationId: string;
  attachmentId: string;
  attachmentOrigin: string | undefined;
  agentBuilder: AgentBuilderPluginStart;
  onOriginUpdated?: (origin: string) => void;
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
    currentSavedObjectId && (
    !currentOrigin || (  // first save
      currentSavedObjectId === currentOrigin  // save again
    ) || (
      previousSavedObjectId === currentOrigin // save as
    ))

    console.log('shouldUpdate', shouldUpdate, currentSavedObjectId, currentOrigin, previousSavedObjectId);

    if (shouldUpdate) {
      void agentBuilder.updateAttachmentOrigin(conversationId, attachmentId, currentSavedObjectId);
      onOriginUpdated?.(currentSavedObjectId);
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
      onOriginUpdated: (origin) => {
        if (currentAttachment?.id === attachment.id) {
          currentAttachment = { ...currentAttachment, origin };
        }
      },
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
          const updatedAttachment = serializeDashboardAttachment({
            api,
            attachmentId,
            origin: currentSavedObjectId,
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

  const agentLiveUpdatesSubscription = createAgentLiveUpdatesSubscription({
    agentBuilder,
    api,
  });

  const manualChangesSubscription = createManualChangesSubscription({
    agentBuilder,
    api,
    getAttachment: () => currentAttachment,
  });

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
      const savedObjectId = api.savedObjectId$.getValue();

      const attachment = serializeDashboardAttachment({
        api,
        attachmentId: pendingDashboardAttachmentId,
        origin: savedObjectId,
      });
      if (!attachment || !attachment.data) {
        return;
      }

      agentBuilder.addAttachment(attachment);
      setupPendingAttachmentOriginSync(pendingDashboardAttachmentId, savedObjectId);

      // Set current attachment for manual changes tracking
      currentAttachment = {
        id: pendingDashboardAttachmentId,
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

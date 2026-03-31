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
import { isDashboardAttachment } from './is_dashboard_attachment';
import { createManualChangesSubscription } from './manual_changes_subscription';
import { createOriginSyncSubscription } from './origin_sync_subscription';
import { serializeDashboardAttachment } from './serialize_dashboard_attachment';

interface DashboardAttachmentSessionState {
  conversationId?: string;
  attachmentId?: string;
  data?: DashboardAttachment['data'];
  conversationOrigin?: string;
  localOrigin?: string;
}

export const registerDashboardAppIntegration = ({
  agentBuilder,
  api,
}: {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
}): (() => void) => {
  let pendingDashboardAttachmentId: string | undefined;
  let attachmentSession: DashboardAttachmentSessionState = {};
  let originSyncSubscription: Subscription | undefined;
  let pendingAttachmentOriginSyncSubscription: Subscription | undefined;

  const getCurrentAttachment = (): DashboardAttachment | undefined => {
    if (!attachmentSession.attachmentId || !attachmentSession.data) {
      return undefined;
    }

    return {
      id: attachmentSession.attachmentId,
      type: DASHBOARD_ATTACHMENT_TYPE,
      data: attachmentSession.data,
      origin: attachmentSession.localOrigin ?? attachmentSession.conversationOrigin,
    };
  };

  const setCurrentAttachmentSession = ({
    conversationId,
    attachmentId,
    data,
    conversationOrigin,
    preserveLocalOrigin = false,
  }: {
    conversationId?: string;
    attachmentId?: string;
    data?: DashboardAttachment['data'];
    conversationOrigin?: string;
    preserveLocalOrigin?: boolean;
  }) => {
    const localOrigin =
      preserveLocalOrigin &&
      attachmentSession.conversationId === conversationId &&
      attachmentSession.attachmentId === attachmentId
        ? attachmentSession.localOrigin
        : undefined;

    attachmentSession = {
      conversationId,
      attachmentId,
      data,
      conversationOrigin,
      localOrigin,
    };
  };

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
    attachmentSession = {};
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
        if (
          attachmentSession.conversationId === conversationId &&
          attachmentSession.attachmentId === attachment.id
        ) {
          attachmentSession = {
            ...attachmentSession,
            localOrigin: origin,
          };
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
            if (attachmentSession.attachmentId === attachmentId) {
              attachmentSession = {
                ...attachmentSession,
                data: updatedAttachment.data,
                localOrigin: currentSavedObjectId,
              };
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
    getAttachment: getCurrentAttachment,
  });

  agentBuilder.setChatConfig({
    onConversationChange: ({ id: conversationId, attachments }) => {
      // Always clean up origin sync for existing attachments
      cleanupOriginSync();
      // Always remove pending attachment when conversation changes
      // This ensures we don't carry over attachments from previous conversations
      removePendingDashboardAttachment();

      const existingDashboardAttachment = attachments?.find(isDashboardAttachment);

      if (existingDashboardAttachment && conversationId) {
        // Switching to a conversation with existing dashboard attachment
        // Set up sync for existing attachment
        setupOriginSyncForExistingAttachment(conversationId, existingDashboardAttachment);

        // Set current attachment from existing versioned attachment
        const latestVersion = getLatestVersion(existingDashboardAttachment);
        setCurrentAttachmentSession({
          conversationId,
          attachmentId: existingDashboardAttachment.id,
          data: latestVersion?.data as DashboardAttachment['data'] | undefined,
          conversationOrigin: existingDashboardAttachment.origin,
          preserveLocalOrigin: true,
        });
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
      setCurrentAttachmentSession({
        conversationId,
        attachmentId: pendingDashboardAttachmentId,
        data: attachment.data,
        conversationOrigin: attachment.origin,
      });
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

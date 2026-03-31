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

interface EmptyDashboardAttachmentSessionState {
  kind: 'empty';
}

interface ExistingDashboardAttachmentSessionState {
  kind: 'existing';
  conversationId: string;
  attachmentId: string;
  data?: DashboardAttachment['data'];
  conversationOrigin?: string;
  localOrigin?: string;
}

interface PendingDashboardAttachmentSessionState {
  kind: 'pending';
  conversationId?: string;
  attachmentId: string;
  data: DashboardAttachment['data'];
  conversationOrigin?: string;
  localOrigin?: string;
}

type DashboardAttachmentSessionState =
  | EmptyDashboardAttachmentSessionState
  | ExistingDashboardAttachmentSessionState
  | PendingDashboardAttachmentSessionState;

export const registerDashboardAppIntegration = ({
  agentBuilder,
  api,
}: {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
}): (() => void) => {
  let pendingDashboardAttachmentId: string | undefined;
  let attachmentSession: DashboardAttachmentSessionState = { kind: 'empty' };
  let originSyncSubscription: Subscription | undefined;
  let pendingAttachmentOriginSyncSubscription: Subscription | undefined;

  const getCurrentAttachmentOrigin = (): string | undefined =>
    attachmentSession.kind === 'empty'
      ? undefined
      : attachmentSession.localOrigin ?? attachmentSession.conversationOrigin;

  const getCurrentAttachment = (): DashboardAttachment | undefined => {
    if (attachmentSession.kind === 'empty' || !attachmentSession.data) {
      return undefined;
    }

    return {
      id: attachmentSession.attachmentId,
      type: DASHBOARD_ATTACHMENT_TYPE,
      data: attachmentSession.data,
      origin: getCurrentAttachmentOrigin(),
    };
  };

  const setExistingAttachmentSession = ({
    conversationId,
    attachmentId,
    data,
    conversationOrigin,
    preserveLocalOrigin = false,
  }: {
    conversationId: string;
    attachmentId: string;
    data?: DashboardAttachment['data'];
    conversationOrigin?: string;
    preserveLocalOrigin?: boolean;
  }) => {
    const localOrigin =
      preserveLocalOrigin &&
      attachmentSession.kind !== 'empty' &&
      attachmentSession.conversationId === conversationId &&
      attachmentSession.attachmentId === attachmentId
        ? attachmentSession.localOrigin
        : undefined;

    attachmentSession = {
      kind: 'existing',
      conversationId,
      attachmentId,
      data,
      conversationOrigin,
      localOrigin,
    };
  };

  const setPendingAttachmentSession = ({
    conversationId,
    attachmentId,
    data,
    conversationOrigin,
  }: {
    conversationId?: string;
    attachmentId: string;
    data: DashboardAttachment['data'];
    conversationOrigin?: string;
  }) => {
    attachmentSession = {
      kind: 'pending',
      conversationId,
      attachmentId,
      data,
      conversationOrigin,
      localOrigin: undefined,
    };
  };

  const updateSessionOrigin = (origin: string) => {
    if (attachmentSession.kind === 'empty') {
      return;
    }

    attachmentSession = {
      ...attachmentSession,
      localOrigin: origin,
    };
  };

  const updateSessionFromSerializedAttachment = ({
    attachment,
    origin,
  }: {
    attachment: Pick<DashboardAttachment, 'data'>;
    origin: string;
  }) => {
    if (attachmentSession.kind === 'empty') {
      return;
    }

    attachmentSession = {
      ...attachmentSession,
      data: attachment.data,
      localOrigin: origin,
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
    attachmentSession = { kind: 'empty' };
  };

  const setupOriginSyncForExistingAttachment = (
    conversationId: string,
    attachment: VersionedAttachment
  ) => {
    cleanupOriginSync();
    originSyncSubscription = createOriginSyncSubscription({
      api,
      attachmentOrigin: attachment.origin,
      onOriginChange: (origin) => {
        void agentBuilder.updateAttachmentOrigin(conversationId, attachment.id, origin);
        if (
          attachmentSession.kind === 'existing' &&
          attachmentSession.conversationId === conversationId &&
          attachmentSession.attachmentId === attachment.id
        ) {
          updateSessionOrigin(origin);
        }
      },
    });
  };

  const setupPendingAttachmentOriginSync = (attachmentId: string, initialOrigin?: string) => {
    cleanupPendingAttachmentOriginSync();
    pendingAttachmentOriginSyncSubscription = createOriginSyncSubscription({
      api,
      attachmentOrigin: initialOrigin,
      onOriginChange: (origin) => {
        if (pendingDashboardAttachmentId !== attachmentId) {
          return;
        }

        // Re-add the attachment with updated origin
        const updatedAttachment = serializeDashboardAttachment({
          api,
          attachmentId,
          origin,
        });
        if (updatedAttachment) {
          agentBuilder.addAttachment(updatedAttachment);
          if (
            attachmentSession.kind === 'pending' &&
            attachmentSession.attachmentId === attachmentId
          ) {
            updateSessionFromSerializedAttachment({
              attachment: updatedAttachment,
              origin,
            });
          }
        }
      },
    });
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
        setExistingAttachmentSession({
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
      setPendingAttachmentSession({
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

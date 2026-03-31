/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subscription } from 'rxjs';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { isDashboardAttachment } from './is_dashboard_attachment';
import { createOriginSyncSubscription } from './origin_sync_subscription';
import { activatePendingAttachmentSession } from './pending_attachment_session';

interface EmptyDashboardAttachmentSessionState {
  kind: 'empty';
}

interface ExistingDashboardAttachmentSessionState {
  kind: 'existing';
  conversationId: string;
  attachmentId: string;
  data?: DashboardAttachment['data'];
  persistedOrigin?: string;
  localOrigin?: string;
}

interface PendingDashboardAttachmentSessionState {
  kind: 'pending';
  conversationId?: string;
  attachmentId: string;
  data: DashboardAttachment['data'];
  persistedOrigin?: string;
  localOrigin?: string;
}

type DashboardAttachmentSessionState =
  | EmptyDashboardAttachmentSessionState
  | ExistingDashboardAttachmentSessionState
  | PendingDashboardAttachmentSessionState;

export interface DashboardAttachmentSessionController {
  getCurrentAttachment: () => DashboardAttachment | undefined;
  handleConversationChange: (params: {
    conversationId?: string;
    attachments?: VersionedAttachment[];
  }) => void;
  cleanup: () => void;
}

export const createDashboardAttachmentSessionController = ({
  api,
  agentBuilder,
}: {
  api: DashboardApi;
  agentBuilder: AgentBuilderPluginStart;
}): DashboardAttachmentSessionController => {
  let pendingDashboardAttachmentId: string | undefined;
  let attachmentSession: DashboardAttachmentSessionState = { kind: 'empty' };
  let originSyncSubscription: Subscription | undefined;
  let pendingAttachmentOriginSyncSubscription: Subscription | undefined;

  const getCurrentAttachmentOrigin = (): string | undefined =>
    attachmentSession.kind === 'empty'
      ? undefined
      : attachmentSession.localOrigin ?? attachmentSession.persistedOrigin;

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
    persistedOrigin,
    preserveLocalOrigin = false,
    previousSession,
  }: {
    conversationId: string;
    attachmentId: string;
    data?: DashboardAttachment['data'];
    persistedOrigin?: string;
    preserveLocalOrigin?: boolean;
    previousSession?: DashboardAttachmentSessionState;
  }) => {
    const localOrigin =
      preserveLocalOrigin &&
      previousSession &&
      previousSession.kind !== 'empty' &&
      previousSession.conversationId === conversationId &&
      previousSession.attachmentId === attachmentId
        ? previousSession.localOrigin
        : undefined;

    attachmentSession = {
      kind: 'existing',
      conversationId,
      attachmentId,
      data,
      persistedOrigin,
      localOrigin,
    };
  };

  const setPendingAttachmentSession = ({
    conversationId,
    attachmentId,
    data,
    persistedOrigin,
  }: {
    conversationId?: string;
    attachmentId: string;
    data: DashboardAttachment['data'];
    persistedOrigin?: string;
  }) => {
    attachmentSession = {
      kind: 'pending',
      conversationId,
      attachmentId,
      data,
      persistedOrigin,
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

  const clearAttachmentSession = () => {
    attachmentSession = { kind: 'empty' };
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

  const resetConversationAttachmentSession = () => {
    cleanupOriginSync();
    removePendingDashboardAttachment();
    clearAttachmentSession();
  };

  const activateExistingAttachmentSession = ({
    conversationId,
    attachment,
    previousSession,
  }: {
    conversationId: string;
    attachment: VersionedAttachment<typeof DASHBOARD_ATTACHMENT_TYPE>;
    previousSession?: DashboardAttachmentSessionState;
  }) => {
    setupOriginSyncForExistingAttachment(conversationId, attachment);

    setExistingAttachmentSession({
      conversationId,
      attachmentId: attachment.id,
      data: getLatestVersion(attachment)?.data as DashboardAttachment['data'] | undefined,
      persistedOrigin: attachment.origin,
      preserveLocalOrigin: true,
      previousSession,
    });
  };

  const activatePendingAttachmentSessionForConversation = (conversationId?: string) => {
    cleanupPendingAttachmentOriginSync();

    const pendingSession = activatePendingAttachmentSession({
      api,
      agentBuilder,
      onOriginChange: ({ attachmentId, attachment, origin }) => {
        if (
          attachmentSession.kind === 'pending' &&
          attachmentSession.attachmentId === attachmentId
        ) {
          updateSessionFromSerializedAttachment({
            attachment,
            origin,
          });
        }
      },
    });

    if (!pendingSession) {
      return;
    }

    pendingDashboardAttachmentId = pendingSession.attachmentId;
    pendingAttachmentOriginSyncSubscription = pendingSession.originSyncSubscription;

    setPendingAttachmentSession({
      conversationId,
      attachmentId: pendingSession.attachmentId,
      data: pendingSession.attachment.data,
      persistedOrigin: pendingSession.attachment.origin,
    });
  };

  const handleConversationChange = ({
    conversationId,
    attachments,
  }: {
    conversationId?: string;
    attachments?: VersionedAttachment[];
  }) => {
    const previousSession = attachmentSession;
    resetConversationAttachmentSession();

    const existingDashboardAttachment = attachments?.find(isDashboardAttachment);

    if (existingDashboardAttachment && conversationId) {
      activateExistingAttachmentSession({
        conversationId,
        attachment: existingDashboardAttachment,
        previousSession,
      });
      return;
    }

    activatePendingAttachmentSessionForConversation(conversationId);
  };

  const cleanup = () => {
    cleanupOriginSync();
    removePendingDashboardAttachment();
  };

  return {
    getCurrentAttachment,
    handleConversationChange,
    cleanup,
  };
};

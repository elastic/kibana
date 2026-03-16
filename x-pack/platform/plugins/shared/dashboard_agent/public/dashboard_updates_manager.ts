/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { auditTime, filter, map, merge, type Observable, type Subscription } from 'rxjs';
import {
  ATTACHMENT_REF_OPERATION,
  type AttachmentInput,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import type { ChatEvent } from '@kbn/agent-builder-common/chat';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common/chat';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import type {
  DashboardAttachment,
  DashboardAttachmentData,
  DashboardAttachmentOrigin,
} from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { getStateFromAttachment } from './attachment_types/attachment_to_dashboard_state';
import { toDashboardAttachmentData } from './attachment_types/dashboard_attachment_data';

type VersionedDashboardAttachment = VersionedAttachment<
  typeof DASHBOARD_ATTACHMENT_TYPE,
  DashboardAttachmentData
> & {
  origin?: DashboardAttachmentOrigin;
};

export interface DashboardUpdatesManager {
  setDashboardApi: (api: DashboardApi | undefined) => void;
  setCurrentAttachmentId: (id: string) => void;
  setCurrentAttachmentOrigin: (origin: DashboardAttachmentOrigin | undefined) => void;
  stop: () => void;
}

interface CreateDashboardUpdatesManagerParams {
  chat$: Observable<ChatEvent>;
  addAttachment: (attachment: AttachmentInput) => void;
  setChatConfig: (config: { sessionTag: string; attachments: AttachmentInput[] }) => void;
  clearChatConfig: (() => void) | undefined;
}

export const createDashboardUpdatesManager = ({
  chat$,
  addAttachment,
  setChatConfig,
  clearChatConfig,
}: CreateDashboardUpdatesManagerParams): DashboardUpdatesManager => {
  let dashboardApi: DashboardApi | undefined;
  let chatLiveUpdatesSubscription: Subscription | undefined;
  let manualUpdatesSubscription: Subscription | undefined;
  let currentAttachmentId: string | undefined;
  let currentAttachmentOrigin: DashboardAttachmentOrigin | undefined;
  let lastContextAttachmentHash: string | undefined;

  const shouldSyncManualChanges = (): boolean => {
    if (!dashboardApi || !currentAttachmentId) {
      return false;
    }
    const currentSavedObjectId = dashboardApi.savedObjectId$.getValue();
    const attachmentLinkedSavedObjectId = currentAttachmentOrigin?.savedObjectId;

    // Sync if: no saved dashboard OR saved dashboard matches attachment's linked dashboard
    return !currentSavedObjectId || currentSavedObjectId === attachmentLinkedSavedObjectId;
  };

  const syncManualChangesToAttachment = () => {
    if (!dashboardApi || !shouldSyncManualChanges()) {
      return;
    }

    const currentDashboardState = dashboardApi.getSerializedState().attributes;
    if (!currentDashboardState) {
      return;
    }

    addAttachment({
      id: currentAttachmentId,
      type: DASHBOARD_ATTACHMENT_TYPE,
      data: toDashboardAttachmentData(currentDashboardState),
    });
  };

  const syncDashboardContextToChatConfig = () => {
    if (!dashboardApi) {
      return;
    }

    const currentDashboardState = dashboardApi.getSerializedState().attributes;
    if (!currentDashboardState) {
      return;
    }

    const savedObjectId = dashboardApi.savedObjectId$.getValue();
    const attachment: AttachmentInput = {
      id: savedObjectId
        ? `dashboard-context:${savedObjectId}`
        : `dashboard-context:${dashboardApi.uuid}`,
      type: DASHBOARD_ATTACHMENT_TYPE,
      data: toDashboardAttachmentData(currentDashboardState, savedObjectId),
    };

    const nextHash = JSON.stringify(attachment);
    if (nextHash === lastContextAttachmentHash) {
      return;
    }
    lastContextAttachmentHash = nextHash;

    setChatConfig({
      sessionTag: 'dashboard',
      attachments: [attachment],
    });
  };

  const startManualUpdatesSubscription = () => {
    manualUpdatesSubscription?.unsubscribe();

    if (!dashboardApi) {
      return;
    }

    manualUpdatesSubscription = merge(
      dashboardApi.query$.pipe(map(() => undefined)),
      dashboardApi.filters$.pipe(map(() => undefined)),
      dashboardApi.timeRange$.pipe(map(() => undefined)),
      dashboardApi.layout$.pipe(map(() => undefined)),
      dashboardApi.title$.pipe(map(() => undefined)),
      dashboardApi.description$.pipe(map(() => undefined)),
      dashboardApi.hasUnsavedChanges$.pipe(map(() => undefined))
    )
      .pipe(auditTime(150))
      .subscribe(() => {
        syncManualChangesToAttachment();
        syncDashboardContextToChatConfig();
      });
  };

  const startChatLiveUpdatesSubscription = () => {
    chatLiveUpdatesSubscription?.unsubscribe();

    chatLiveUpdatesSubscription = chat$
      .pipe(
        filter(isRoundCompleteEvent),
        filter(() => Boolean(dashboardApi))
      )
      .subscribe((event) => {
        const updatedVersionedAttachment = event.data.attachments?.find(
          (attachment): attachment is VersionedDashboardAttachment =>
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

        // Track the attachment ID and origin for manual sync
        currentAttachmentId = updatedVersionedAttachment.id;
        currentAttachmentOrigin = updatedVersionedAttachment.origin;

        const currentSavedObjectId = dashboardApi!.savedObjectId$.getValue();
        const attachmentLinkedSavedObjectId = updatedVersionedAttachment.origin?.savedObjectId;

        // Skip if viewing a saved dashboard that differs from the attachment's linked dashboard
        if (currentSavedObjectId && attachmentLinkedSavedObjectId !== currentSavedObjectId) {
          return;
        }

        // Get the latest version's data
        const latestVersion =
          updatedVersionedAttachment.versions[updatedVersionedAttachment.versions.length - 1];
        if (!latestVersion) {
          return;
        }

        const attachment: DashboardAttachment = {
          id: updatedVersionedAttachment.id,
          type: DASHBOARD_ATTACHMENT_TYPE,
          data: latestVersion.data,
          origin: updatedVersionedAttachment.origin,
        };

        dashboardApi!.setState(getStateFromAttachment(attachment));
        setTimeout(() => dashboardApi!.scrollToBottom(), 0);
      });
  };

  const setDashboardApi = (api: DashboardApi | undefined) => {
    dashboardApi = api;
    if (api) {
      syncDashboardContextToChatConfig();
      startChatLiveUpdatesSubscription();
      startManualUpdatesSubscription();
    } else {
      chatLiveUpdatesSubscription?.unsubscribe();
      chatLiveUpdatesSubscription = undefined;
      manualUpdatesSubscription?.unsubscribe();
      manualUpdatesSubscription = undefined;
      clearChatConfig?.();
      lastContextAttachmentHash = undefined;
    }
  };

  const setCurrentAttachmentId = (id: string) => {
    currentAttachmentId = id;
  };

  const setCurrentAttachmentOrigin = (origin: DashboardAttachmentOrigin | undefined) => {
    currentAttachmentOrigin = origin;
  };

  const stop = () => {
    chatLiveUpdatesSubscription?.unsubscribe();
    chatLiveUpdatesSubscription = undefined;
    manualUpdatesSubscription?.unsubscribe();
    manualUpdatesSubscription = undefined;
    dashboardApi = undefined;
    currentAttachmentId = undefined;
    currentAttachmentOrigin = undefined;
    lastContextAttachmentHash = undefined;
  };

  return {
    setDashboardApi,
    setCurrentAttachmentId,
    setCurrentAttachmentOrigin,
    stop,
  };
};

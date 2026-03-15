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
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type AttachmentPanel,
  type DashboardSection,
} from '@kbn/dashboard-agent-common';
import type {
  DashboardAttachment,
  DashboardAttachmentData,
  DashboardAttachmentOrigin,
} from '@kbn/dashboard-agent-common/types';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardPanel, DashboardState } from '@kbn/dashboard-plugin/server';
import { type LensAttributes, LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import { isLensLegacyAttributes } from '@kbn/lens-embeddable-utils/config_builder/utils';
import { getStateFromAttachment } from './attachment_types/attachment_to_dashboard_state';

const lensConfigBuilder = new LensConfigBuilder();

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
}

export const createDashboardUpdatesManager = ({
  chat$,
  addAttachment,
}: CreateDashboardUpdatesManagerParams): DashboardUpdatesManager => {
  let dashboardApi: DashboardApi | undefined;
  let chatLiveUpdatesSubscription: Subscription | undefined;
  let manualUpdatesSubscription: Subscription | undefined;
  let currentAttachmentId: string | undefined;
  let currentAttachmentOrigin: DashboardAttachmentOrigin | undefined;

  const toAttachmentPanel = (panel: DashboardPanel): AttachmentPanel => {
    if (
      panel.type === 'lens' &&
      panel.config &&
      typeof panel.config === 'object' &&
      'attributes' in panel.config
    ) {
      const lensConfig = panel.config as { attributes: LensAttributes; title?: string };
      // Convert LensAttributes (internal format) to API format for the attachment
      if (isLensLegacyAttributes(lensConfig.attributes)) {
        return {
          type: 'lens',
          panelId: panel.uid ?? '',
          visualization: lensConfigBuilder.toAPIFormat(lensConfig.attributes),
          title: typeof lensConfig.title === 'string' ? lensConfig.title : undefined,
          grid: panel.grid,
        };
      }
    }

    return {
      type: panel.type,
      panelId: panel.uid ?? '',
      rawConfig: panel.config as Record<string, unknown>,
      title:
        panel.config && typeof panel.config === 'object' && 'title' in panel.config
          ? ((panel.config as { title?: unknown }).title as string | undefined)
          : undefined,
      grid: panel.grid,
    };
  };

  const toDashboardAttachmentData = (state: DashboardState): DashboardAttachmentData => {
    const topLevelPanels: AttachmentPanel[] = [];
    const sections: DashboardSection[] = [];

    for (const item of state.panels ?? []) {
      if ('panels' in item) {
        sections.push({
          sectionId: item.uid ?? '',
          title: item.title,
          collapsed: item.collapsed ?? false,
          grid: { y: item.grid.y },
          panels: item.panels.map(toAttachmentPanel),
        });
      } else {
        topLevelPanels.push(toAttachmentPanel(item));
      }
    }

    return {
      title: state.title ?? '',
      description: state.description ?? '',
      panels: topLevelPanels,
      ...(sections.length ? { sections } : {}),
    };
  };

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
      startChatLiveUpdatesSubscription();
      startManualUpdatesSubscription();
    } else {
      chatLiveUpdatesSubscription?.unsubscribe();
      chatLiveUpdatesSubscription = undefined;
      manualUpdatesSubscription?.unsubscribe();
      manualUpdatesSubscription = undefined;
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
  };

  return {
    setDashboardApi,
    setCurrentAttachmentId,
    setCurrentAttachmentOrigin,
    stop,
  };
};

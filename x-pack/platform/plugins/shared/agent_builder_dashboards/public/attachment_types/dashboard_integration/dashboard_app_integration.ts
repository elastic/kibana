/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounceTime, merge, Observable } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { UpdateOriginResponse } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type {
  DashboardAttachment,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common/types';
import {
  isDashboardAttachment,
  DASHBOARD_ATTACHMENT_TYPE,
} from '@kbn/agent-builder-dashboards-common';
import { isEqual } from 'lodash';
import {
  getDashboardSnapshot,
  isAttachmentShownInDashboard,
  MANUAL_CHANGES_DEBOUNCE_MS,
  type DashboardSnapshot,
} from './apply_attachment';
import { toShownVersionKey, type AppliedAttachmentsStore } from './applied_attachments_store';
import { createAgentLiveUpdatesSubscription } from './agent_live_updates_subscription';
import { createNewAttachmentIdRegenerationSubscription } from './new_attachment_id_regeneration_subscription';
import { createOriginSyncSubscription } from './origin_sync_subscription';
import { getLinkedAttachment } from './linked_attachment';
import type { IdGenerator } from '..';

export interface DashboardAppIntegrationParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  draftAttachmentId: IdGenerator;
  appliedAttachments: AppliedAttachmentsStore;
  /**
   * Lookup for the framework-provided `updateOrigin` callback bound to a specific
   * attachment id. Returns `undefined` when the attachment has not been rendered yet
   * (and thus hasn't registered an updater). Using this callback instead of
   * `agentBuilder.updateAttachmentOrigin` keeps the rendered conversation in sync
   * because it invalidates the conversation query after persisting the new origin.
   */
  getUpdateOrigin: (
    attachmentId: string
  ) => ((origin: string) => Promise<UpdateOriginResponse | undefined>) | undefined;
  /** Tells the user the agent changed a dashboard other than the open one. */
  notifyOtherDashboardUpdated: (attachment: DashboardAttachment) => void;
}

interface State {
  attachments: DashboardAttachment[] | undefined;
  versionedAttachments: Array<
    VersionedAttachment<typeof DASHBOARD_ATTACHMENT_TYPE, DashboardAttachmentData>
  >;
  conversationId: string | undefined;
}

export const registerDashboardAppIntegration = ({
  agentBuilder,
  api,
  draftAttachmentId,
  appliedAttachments,
  getUpdateOrigin,
  notifyOtherDashboardUpdated,
}: DashboardAppIntegrationParams): (() => void) => {
  const state: State = {
    attachments: undefined,
    versionedAttachments: [],
    conversationId: undefined,
  };

  // dashboard data this dashboard staged in the chat input, per attachment id
  const stagedAttachmentData = new Map<string, DashboardAttachmentData>();
  let pendingSyncTimeout: ReturnType<typeof setTimeout> | undefined;

  // removes what this dashboard staged in the chat input, except the attachment `keepId`
  const unstage = (keepId?: string) => {
    for (const id of stagedAttachmentData.keys()) {
      if (id !== keepId) {
        stagedAttachmentData.delete(id);
        agentBuilder.removeAttachment(id);
      }
    }
  };

  // marks every attachment version the open dashboard shows
  const updateShownVersions = (dashboard: DashboardSnapshot) => {
    const shownVersions = new Set<string>();
    for (const { id, versions } of state.versionedAttachments) {
      for (const { version, data } of versions) {
        if (isAttachmentShownInDashboard(api, dashboard, data)) {
          shownVersions.add(toShownVersionKey(id, version));
        }
      }
    }
    appliedAttachments.setShownVersions(shownVersions);
  };

  // stages the dashboard as a pending version unless it shows the linked attachment's latest version
  const updatePendingVersion = (dashboard: DashboardSnapshot) => {
    const linkedAttachment = getLinkedAttachment({
      api,
      store: appliedAttachments,
      attachments: state.attachments,
      dashboard,
      draftAttachmentId: draftAttachmentId.current,
    });
    // changes become versions of the linked attachment, otherwise the dashboard is staged as a draft
    const attachmentId = linkedAttachment?.id ?? draftAttachmentId.current;
    appliedAttachments.setLinkedAttachmentId(api, attachmentId);

    if (linkedAttachment && isAttachmentShownInDashboard(api, dashboard, linkedAttachment.data)) {
      unstage();
      return;
    }
    unstage(attachmentId);
    if (isEqual(stagedAttachmentData.get(attachmentId), dashboard.data)) {
      return;
    }

    stagedAttachmentData.set(attachmentId, dashboard.data);
    agentBuilder.addAttachment({
      id: attachmentId,
      origin: api.savedObjectId$.getValue() ?? linkedAttachment?.origin,
      type: DASHBOARD_ATTACHMENT_TYPE,
      data: dashboard.data,
    });
  };

  const syncWithConversation = () => {
    // the dashboard is still settling after applying an attachment, so its state is not a manual change
    if (appliedAttachments.isApplying()) {
      return;
    }
    const dashboard = getDashboardSnapshot(api);
    updateShownVersions(dashboard);
    updatePendingVersion(dashboard);
  };

  const conversationChangesSubscription = agentBuilder.events.ui.activeConversation$.subscribe(
    (change) => {
      if (!change) {
        state.attachments = undefined;
        state.versionedAttachments = [];
        state.conversationId = undefined;
        appliedAttachments.setShownVersions();
        return;
      }

      const { id: conversationId, conversation } = change;
      appliedAttachments.setActiveConversationId(conversationId);
      const versionedDashboardAttachments =
        conversation?.attachments?.filter(isDashboardAttachment);
      const dashboardAttachments = versionedDashboardAttachments?.flatMap(
        (attachment): DashboardAttachment[] => {
          const latestVersionData = getLatestVersion(attachment)?.data;

          return latestVersionData
            ? [
                {
                  id: attachment.id,
                  type: attachment.type,
                  data: latestVersionData,
                  origin: attachment.origin,
                },
              ]
            : [];
        }
      );

      // switching conversations empties the chat input, so the dashboard has to be staged again
      if (conversationId !== state.conversationId) {
        stagedAttachmentData.clear();
      }

      state.attachments = dashboardAttachments;
      state.versionedAttachments = versionedDashboardAttachments ?? [];
      state.conversationId = conversationId;
      // we have to defer syncing until after the active conversation change has fully propagated, otherwise sidebarCallbacks from agent builder are null
      if (pendingSyncTimeout !== undefined) {
        clearTimeout(pendingSyncTimeout);
      }
      pendingSyncTimeout = setTimeout(() => {
        pendingSyncTimeout = undefined;
        syncWithConversation();
      });
    }
  );

  const agentLiveUpdatesSubscription = createAgentLiveUpdatesSubscription({
    agentBuilder,
    api,
    appliedAttachments,
    upsertAttachment: (attachment: DashboardAttachment) => {
      const otherAttachments = (state.attachments ?? []).filter(({ id }) => id !== attachment.id);
      state.attachments = [...otherAttachments, attachment];
    },
    onOtherDashboardUpdated: notifyOtherDashboardUpdated,
  });

  const newAttachmentIdRegenerationSubscription = createNewAttachmentIdRegenerationSubscription({
    agentBuilder,
    draftAttachmentId,
  });

  const originSyncSubscription = createOriginSyncSubscription({
    api,
    store: appliedAttachments,
    getAttachments: () => state.attachments,
    updateOrigin: (id: string, origin: string) => getUpdateOrigin(id)?.(origin),
  });

  // an apply ignores the state changes it causes, so compare again once it finished
  const dashboardChangesSubscription = merge(
    api.anyStateChange$.pipe(debounceTime(MANUAL_CHANGES_DEBOUNCE_MS)),
    appliedAttachments.applyFinished$
  ).subscribe(syncWithConversation);

  return () => {
    agentLiveUpdatesSubscription.unsubscribe();
    newAttachmentIdRegenerationSubscription.unsubscribe();
    originSyncSubscription.unsubscribe();
    conversationChangesSubscription.unsubscribe();
    dashboardChangesSubscription.unsubscribe();
    appliedAttachments.setShownVersions();
    if (pendingSyncTimeout !== undefined) {
      clearTimeout(pendingSyncTimeout);
      pendingSyncTimeout = undefined;
    }
    state.attachments = undefined;
    state.versionedAttachments = [];
    state.conversationId = undefined;
    // the staged dashboard belongs to this dashboard, so drop it from the chat input when leaving;
    // attachments already sent stay in the conversation
    unstage();
  };
};

export const createDashboardAppIntegration$ = (
  params: DashboardAppIntegrationParams
  // this stream is meant to be subscribed to for the side effect of registering the integration, it doesn't emit any values and completes when the integration is unregistered
): Observable<never> => new Observable<never>(() => registerDashboardAppIntegration(params));

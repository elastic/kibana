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
  getDashboardAttachmentData,
  isAttachmentAppliedToDashboard,
  MANUAL_CHANGES_DEBOUNCE_MS,
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
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
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
  checkSavedDashboardExist,
  getUpdateOrigin,
}: DashboardAppIntegrationParams): (() => void) => {
  const state: State = {
    attachments: undefined,
    versionedAttachments: [],
    conversationId: undefined,
  };

  // dashboard data last staged in the chat input, per attachment id
  const stagedAttachmentData = new Map<string, DashboardAttachmentData>();
  // linked attachments the dashboard showed at the last check, so their staged edits are only
  // dropped when the dashboard comes back to them
  const appliedAttachmentIds = new Set<string>();
  let pendingAddAttachmentTimeout: ReturnType<typeof setTimeout> | undefined;

  // marks every attachment version in the conversation whose content the dashboard shows
  const updateShownVersions = () => {
    if (appliedAttachments.isApplying()) {
      return;
    }
    const dashboardData = getDashboardAttachmentData(api);
    const shownVersions = new Set<string>();
    for (const { id, versions } of state.versionedAttachments) {
      for (const { version, data } of versions) {
        if (
          isAttachmentAppliedToDashboard({
            store: appliedAttachments,
            dashboardData,
            attachment: { id, data },
          })
        ) {
          shownVersions.add(toShownVersionKey(id, version));
        }
      }
    }
    if (!isEqual(shownVersions, appliedAttachments.shownVersions$.getValue())) {
      appliedAttachments.shownVersions$.next(shownVersions);
    }
  };

  const addAttachmentFromDashboard = () => {
    // the dashboard is still settling after applying an attachment, so its state is not a manual change
    if (appliedAttachments.isApplying()) {
      return;
    }

    const dashboardData = getDashboardAttachmentData(api);
    const linkedAttachment = getLinkedAttachment({
      api,
      store: appliedAttachments,
      attachments: state.attachments,
      dashboardData,
    });
    // changes become versions of the linked attachment, otherwise the dashboard is staged as a draft
    const attachmentId = linkedAttachment?.id ?? draftAttachmentId.current;

    if (
      linkedAttachment &&
      isAttachmentAppliedToDashboard({
        store: appliedAttachments,
        dashboardData,
        attachment: linkedAttachment,
      })
    ) {
      // the chat already has this state, so drop an edit staged before it was reverted, even one
      // staged before the integration re-registered
      if (!appliedAttachmentIds.has(attachmentId)) {
        appliedAttachmentIds.add(attachmentId);
        stagedAttachmentData.delete(attachmentId);
        agentBuilder.removeAttachment(attachmentId);
      }
      return;
    }

    appliedAttachmentIds.delete(attachmentId);
    if (isEqual(stagedAttachmentData.get(attachmentId), dashboardData)) {
      return;
    }

    stagedAttachmentData.set(attachmentId, dashboardData);
    appliedAttachments.linkedAttachmentIds.set(api, attachmentId);
    agentBuilder.addAttachment({
      id: attachmentId,
      origin: api.savedObjectId$.getValue() ?? linkedAttachment?.origin,
      type: DASHBOARD_ATTACHMENT_TYPE,
      data: dashboardData,
    });
  };

  const conversationChangesSubscription = agentBuilder.events.ui.activeConversation$.subscribe(
    (change) => {
      if (!change) {
        state.attachments = undefined;
        state.versionedAttachments = [];
        state.conversationId = undefined;
        updateShownVersions();
        return;
      }

      const { id: conversationId, conversation } = change;
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

      state.attachments = dashboardAttachments;
      state.versionedAttachments = versionedDashboardAttachments ?? [];
      state.conversationId = conversationId;
      updateShownVersions();
      // we have to defer adding the attachment from the dashboard until after the active conversation change has fully propagated, otherwise sidebarCallbacks from agent builder are null
      if (pendingAddAttachmentTimeout !== undefined) {
        clearTimeout(pendingAddAttachmentTimeout);
      }
      pendingAddAttachmentTimeout = setTimeout(() => {
        pendingAddAttachmentTimeout = undefined;
        addAttachmentFromDashboard();
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
  });

  const newAttachmentIdRegenerationSubscription = createNewAttachmentIdRegenerationSubscription({
    agentBuilder,
    draftAttachmentId,
  });

  const originSyncSubscription = createOriginSyncSubscription({
    api,
    checkSavedDashboardExist,
    getAttachments: () => state.attachments,
    updateOrigin: (id: string, origin: string) => getUpdateOrigin(id)?.(origin),
  });

  const manualChangesSubscription = api.anyStateChange$
    .pipe(debounceTime(MANUAL_CHANGES_DEBOUNCE_MS))
    .subscribe(addAttachmentFromDashboard);

  const shownVersionsSubscription = merge(
    api.anyStateChange$.pipe(debounceTime(MANUAL_CHANGES_DEBOUNCE_MS)),
    appliedAttachments.applyFinished$
  ).subscribe(updateShownVersions);

  return () => {
    agentLiveUpdatesSubscription.unsubscribe();
    newAttachmentIdRegenerationSubscription.unsubscribe();
    originSyncSubscription.unsubscribe();
    manualChangesSubscription.unsubscribe();
    conversationChangesSubscription.unsubscribe();
    shownVersionsSubscription.unsubscribe();
    appliedAttachments.shownVersions$.next(new Set());
    if (pendingAddAttachmentTimeout !== undefined) {
      clearTimeout(pendingAddAttachmentTimeout);
      pendingAddAttachmentTimeout = undefined;
    }
    state.attachments = undefined;
    state.versionedAttachments = [];
    state.conversationId = undefined;
    // the staged dashboard belongs to this dashboard, so drop it from the chat input when leaving;
    // attachments already sent stay in the conversation
    for (const attachmentId of stagedAttachmentData.keys()) {
      agentBuilder.removeAttachment(attachmentId);
    }
    stagedAttachmentData.clear();
    appliedAttachmentIds.clear();
  };
};

export const createDashboardAppIntegration$ = (
  params: DashboardAppIntegrationParams
  // this stream is meant to be subscribed to for the side effect of registering the integration, it doesn't emit any values and completes when the integration is unregistered
): Observable<never> => new Observable<never>(() => registerDashboardAppIntegration(params));

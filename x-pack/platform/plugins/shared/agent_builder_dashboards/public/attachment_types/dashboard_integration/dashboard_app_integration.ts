/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounceTime, Observable } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { UpdateOriginResponse } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common/types';
import {
  isDashboardAttachment,
  attachmentDataToDashboardState,
  dashboardStateToAttachmentData,
  DASHBOARD_ATTACHMENT_TYPE,
} from '@kbn/agent-builder-dashboards-common';
import {
  CHILDREN_UNSAVED_CHANGES_DEBOUNCE,
  UNSAVED_CHANGES_DEBOUNCE,
} from '@kbn/presentation-publishing';
import { createAgentLiveUpdatesSubscription } from './agent_live_updates_subscription';
import {
  APPLY_AGENT_CHANGES_ERROR_TITLE,
  applyAgentChangesToDashboard,
  canApplyAgentChangesInPlace,
} from './apply_agent_changes';
import { createNewAttachmentIdRegenerationSubscription } from './new_attachment_id_regeneration_subscription';
import { createOriginSyncSubscription } from './origin_sync_subscription';
import { createOtherDashboardUpdateNotifier } from './other_dashboard_update_notifier';
import type { DashboardLocator } from './open_in_dashboard_app';
import { handlePreview } from '../handle_preview';
import type { IdGenerator } from '..';

/**
 * Layout manager refreshes `getSerializedState()` panel configs only after
 * `UNSAVED_CHANGES_DEBOUNCE` then `CHILDREN_UNSAVED_CHANGES_DEBOUNCE`. Wait that
 * long (+ buffer) so manual sync is not one edit behind.
 */
export const MANUAL_CHANGES_DEBOUNCE_MS =
  UNSAVED_CHANGES_DEBOUNCE + CHILDREN_UNSAVED_CHANGES_DEBOUNCE + 50;

export interface DashboardAppIntegrationParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  canWriteDashboards: boolean;
  dashboardLocator?: DashboardLocator;
  toasts: NotificationsStart['toasts'];
  draftAttachmentId: IdGenerator;
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
  conversationId: string | undefined;
}

export const registerDashboardAppIntegration = ({
  agentBuilder,
  api,
  canWriteDashboards,
  dashboardLocator,
  toasts,
  draftAttachmentId,
  checkSavedDashboardExist,
  getUpdateOrigin,
}: DashboardAppIntegrationParams): (() => void) => {
  const state: State = {
    attachments: undefined,
    conversationId: undefined,
  };

  let pendingAddAttachmentTimeout: ReturnType<typeof setTimeout> | undefined;
  // Attachments staged from this dashboard without an origin, because agent changes to a dashboard
  // the user can't edit open in a new dashboard, which the origin then follows on save. One per
  // conversation started here, so switching back to an earlier conversation still finds its own.
  const unlinkedStagedAttachmentIds = new Set<string>();

  const addAttachmentFromDashboard = () => {
    const isLinkable = canWriteDashboards && canApplyAgentChangesInPlace(api);
    const dashboardId = isLinkable ? api.savedObjectId$.getValue() : undefined;
    const syncAttachment = isLinkable
      ? state.attachments?.find(({ origin }) => origin === dashboardId)
      : undefined;
    const dashboardData = dashboardStateToAttachmentData(api.getSerializedState().attributes);

    // update an existing linked attachment, or add a draft attachment only when the conversation is new
    if (syncAttachment || !state.conversationId) {
      const attachmentId = syncAttachment?.id ?? draftAttachmentId.current;
      if (!isLinkable) {
        unlinkedStagedAttachmentIds.add(attachmentId);
      }
      agentBuilder.addAttachment({
        id: attachmentId,
        origin: dashboardId,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: dashboardData,
      });
    }
  };

  const conversationChangesSubscription = agentBuilder.events.ui.activeConversation$.subscribe(
    (change) => {
      if (!change) {
        state.attachments = undefined;
        state.conversationId = undefined;
        return;
      }

      const { id: conversationId, conversation } = change;
      const dashboardAttachments = conversation?.attachments
        ?.filter(isDashboardAttachment)
        ?.flatMap((attachment): DashboardAttachment[] => {
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
        });

      state.attachments = dashboardAttachments;
      state.conversationId = conversationId;
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

  const otherDashboardUpdateNotifier = createOtherDashboardUpdateNotifier({
    toasts,
    openAttachment: (attachment) =>
      void handlePreview({
        attachment,
        dashboardApi: api,
        canWriteDashboards,
        isSidebar: true,
        dashboardLocator,
        toasts,
        checkSavedDashboardExist,
      }),
  });

  let hasWarnedAboutWritePermission = false;
  const warnAboutWritePermissionOnce = async () => {
    if (hasWarnedAboutWritePermission) {
      return undefined;
    }
    hasWarnedAboutWritePermission = true;
    toasts.addWarning({
      title: i18n.translate('xpack.agentBuilderDashboards.applyAgentChanges.notAppliedToastTitle', {
        defaultMessage: "The agent's changes weren't applied",
      }),
      text: i18n.translate('xpack.agentBuilderDashboards.applyAgentChanges.noWritePermissionText', {
        defaultMessage:
          "You don't have permission to edit dashboards. Preview the dashboard attachment in the chat to see the changes.",
      }),
    });
    return undefined;
  };

  const applyToOpenDashboard = (attachment: DashboardAttachment) =>
    applyAgentChangesToDashboard({
      api,
      dashboardState: attachmentDataToDashboardState(attachment.data),
      dashboardLocator,
      toasts,
    }).catch((error: Error) => {
      toasts.addError(error, { title: APPLY_AGENT_CHANGES_ERROR_TITLE });
      return undefined;
    });

  const agentLiveUpdatesSubscription = createAgentLiveUpdatesSubscription({
    agentBuilder,
    api,
    isStagedFromDashboard: (attachmentId) => unlinkedStagedAttachmentIds.has(attachmentId),
    upsertAttachment: (attachment: DashboardAttachment) => {
      const otherAttachments = (state.attachments ?? []).filter(({ id }) => id !== attachment.id);
      state.attachments = [...otherAttachments, attachment];
    },
    // without write access, opening another dashboard would show unsaved changes that look saved
    ...(canWriteDashboards
      ? {
          onOpenDashboardUpdated: applyToOpenDashboard,
          onOtherDashboardUpdated: otherDashboardUpdateNotifier.notify,
        }
      : {
          onOpenDashboardUpdated: warnAboutWritePermissionOnce,
          onOtherDashboardUpdated: () => {},
        }),
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

  return () => {
    agentLiveUpdatesSubscription.unsubscribe();
    newAttachmentIdRegenerationSubscription.unsubscribe();
    originSyncSubscription.unsubscribe();
    manualChangesSubscription.unsubscribe();
    conversationChangesSubscription.unsubscribe();
    otherDashboardUpdateNotifier.removeAll();
    if (pendingAddAttachmentTimeout !== undefined) {
      clearTimeout(pendingAddAttachmentTimeout);
      pendingAddAttachmentTimeout = undefined;
    }
    state.attachments = undefined;
    state.conversationId = undefined;
  };
};

export const createDashboardAppIntegration$ = (
  params: DashboardAppIntegrationParams
  // this stream is meant to be subscribed to for the side effect of registering the integration, it doesn't emit any values and completes when the integration is unregistered
): Observable<never> => new Observable<never>(() => registerDashboardAppIntegration(params));

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import {
  isDashboardAttachment,
  dashboardStateToAttachmentData,
  DASHBOARD_ATTACHMENT_TYPE,
} from '@kbn/dashboard-agent-common';
import { createAgentLiveUpdatesSubscription } from './agent_live_updates_subscription';
import { createManualChangesSubscription } from './manual_changes_subscription';
import {
  createIdGenerator,
  createNewAttachmentIdRegenerationSubscription,
} from './new_attachment_id_regeneration_subscription';
import { createOriginSyncSubscription } from './origin_sync_subscription';

export interface DashboardAppIntegrationParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  checkSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}

interface State {
  attachments: DashboardAttachment[] | undefined;
  conversationId: string | undefined;
}

// for draft attachments, we want to keep stable ids across dashboards even if dashboardApi changes (we move to another dashboard)
const draftAttachmentId = createIdGenerator();

export const registerDashboardAppIntegration = ({
  agentBuilder,
  api,
  checkSavedDashboardExist,
}: DashboardAppIntegrationParams): (() => void) => {
  const state: State = {
    attachments: undefined,
    conversationId: undefined,
  };

  const addAttachmentFromDashboard = () => {
    const dashboardId = api.savedObjectId$.getValue();
    const syncAttachment = state.attachments?.find(({ origin }) => origin === dashboardId);
    const dashboardData = dashboardStateToAttachmentData(api.getSerializedState().attributes);

    // update an existing linked attachment, or add a draft attachment only when the conversation is new
    if (syncAttachment || !state.conversationId) {
      agentBuilder.addAttachment({
        id: syncAttachment?.id ?? draftAttachmentId.current,
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

      const { id: conversationId, attachments } = change;
      const dashboardAttachments = attachments
        ?.filter(isDashboardAttachment)
        .flatMap((attachment): DashboardAttachment[] => {
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
      setTimeout(() => addAttachmentFromDashboard());
    }
  );

  const agentLiveUpdatesSubscription = createAgentLiveUpdatesSubscription({
    agentBuilder,
    api,
    setAttachments: (attachments: DashboardAttachment[]) => {
      state.attachments = attachments;
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
    updateOrigin: (id: string, origin: string) =>
      state.conversationId
        ? agentBuilder.updateAttachmentOrigin(state.conversationId, id, origin)
        : undefined,
  });

  const manualChangesSubscription = createManualChangesSubscription({
    api,
    onManualChanges: addAttachmentFromDashboard,
  });

  return () => {
    agentLiveUpdatesSubscription.unsubscribe();
    newAttachmentIdRegenerationSubscription.unsubscribe();
    originSyncSubscription.unsubscribe();
    manualChangesSubscription.unsubscribe();
    conversationChangesSubscription.unsubscribe();
    state.attachments = undefined;
    state.conversationId = undefined;
  };
};

export const createDashboardAppIntegration$ = (
  params: DashboardAppIntegrationParams
  // this stream is meant to be subscribed to for the side effect of registering the integration, it doesn't emit any values and completes when the integration is unregistered
): Observable<never> => new Observable<never>(() => registerDashboardAppIntegration(params));

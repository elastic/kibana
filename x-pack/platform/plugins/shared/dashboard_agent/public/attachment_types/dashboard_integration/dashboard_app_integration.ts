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

export const registerDashboardAppIntegration = ({
  agentBuilder,
  api,
  checkSavedDashboardExist,
}: DashboardAppIntegrationParams): (() => void) => {
  const draftAttachmentId = createIdGenerator();

  const state: State = {
    attachments: undefined,
    conversationId: undefined,
  };
  const setState = (newState: Partial<State>) => {
    Object.assign(state, newState);
  };

  const getAttachments = (): undefined | DashboardAttachment[] => state.attachments;

  const addAttachmentFromDashboard = () => {
    const dashboardId = api.savedObjectId$.getValue();
    const attachments = getAttachments();
    const syncAttachment = dashboardId
      ? attachments?.find(({ origin }) => origin === dashboardId)
      : attachments?.find(({ origin }) => origin === undefined);

    if (syncAttachment || !state.conversationId) {
      agentBuilder.addAttachment({
        id: syncAttachment?.id ?? draftAttachmentId.current,
        origin: dashboardId,
        type: DASHBOARD_ATTACHMENT_TYPE,
        data: dashboardStateToAttachmentData(api.getSerializedState().attributes),
      });
    }
  };

  const createOpenChatSubscriptions = () => {
    const unsubscribeConversationChanges = agentBuilder.subscribeToConversationChanges(
      ({ id: conversationId, attachments }) => {
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

        setState({
          attachments: dashboardAttachments,
          conversationId,
        });

        addAttachmentFromDashboard();
      }
    );

    // when agent creates a new version of dashboard, update the dashboard app to this new state
    const agentLiveUpdatesSubscription = createAgentLiveUpdatesSubscription({
      agentBuilder,
      api,
    });

    // Keep one stable id for the current draft attachment, then rotate it once that draft
    // has been created in the conversation so future edits do not target the committed attachment
    const newAttachmentIdRegenerationSubscription = createNewAttachmentIdRegenerationSubscription({
      agentBuilder,
      draftAttachmentId,
    });

    // keep the attachment's origin in sync with the dashboard's saved object id on dashboard save, so that the attachment always points to the correct dashboard even after saving to a new dashboard or saving an unsaved dashboard
    const originSyncSubscription = createOriginSyncSubscription({
      api,
      checkSavedDashboardExist,
      getAttachments,
      updateOrigin: (id: string, origin: string) =>
        state.conversationId
          ? agentBuilder.updateAttachmentOrigin(state.conversationId, id, origin)
          : undefined,
    });

    // when the dashboard state is manually changed, update the attachment with the new state so that it is up to date when the user tries to share or save the conversation
    const manualChangesSubscription = createManualChangesSubscription({
      api,
      onManualChanges: addAttachmentFromDashboard,
    });

    return () => {
      agentLiveUpdatesSubscription.unsubscribe();
      newAttachmentIdRegenerationSubscription.unsubscribe();
      originSyncSubscription.unsubscribe();
      manualChangesSubscription.unsubscribe();
      unsubscribeConversationChanges();
      setState({
        attachments: undefined,
        conversationId: undefined,
      });
    };
  };

  let stopOpenChatSubscriptions: (() => void) | undefined;
  const chatOpenSubscription = agentBuilder.chatOpen$.subscribe((isOpen) => {
    if (isOpen) {
      if (!stopOpenChatSubscriptions) {
        stopOpenChatSubscriptions = createOpenChatSubscriptions();
      }
      return;
    }

    stopOpenChatSubscriptions?.();
    stopOpenChatSubscriptions = undefined;
  });

  return () => {
    chatOpenSubscription.unsubscribe();
    stopOpenChatSubscriptions?.();
  };
};

export const createDashboardAppIntegration$ = (
  params: DashboardAppIntegrationParams
  // this stream is meant to be subscribed to for the side effect of registering the integration, it doesn't emit any values and completes when the integration is unregistered
): Observable<never> => new Observable<never>(() => registerDashboardAppIntegration(params));

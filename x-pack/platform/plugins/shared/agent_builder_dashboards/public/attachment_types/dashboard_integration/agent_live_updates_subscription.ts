/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY, switchMap, type Subscription } from 'rxjs';
import { isToolUiEvent, type ToolUiEvent } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart, BrowserChatEvent } from '@kbn/agent-builder-browser';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common';
import { attachmentDataToDashboardState } from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  DASHBOARD_BUILD_ENDED_UI_EVENT,
  DASHBOARD_BUILD_STARTED_UI_EVENT,
  DASHBOARD_PANEL_RESOLVED_UI_EVENT,
  DASHBOARD_UPDATED_UI_EVENT,
  type DashboardBuildEndedUiEventData,
  type DashboardBuildStartedUiEventData,
  type DashboardPanelResolvedUiEventData,
  type DashboardUpdatedUiEventData,
} from '../../../common';
import { createLiveBuild } from './live_build';

export interface AgentLiveUpdatesSubscriptionParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  upsertAttachment: (attachment: DashboardAttachment) => void;
  getAttachments: () => DashboardAttachment[] | undefined;
}

const isDashboardUpdatedUiEvent = (
  event: BrowserChatEvent
): event is ToolUiEvent<typeof DASHBOARD_UPDATED_UI_EVENT, DashboardUpdatedUiEventData> =>
  isToolUiEvent(event, DASHBOARD_UPDATED_UI_EVENT);

const isBuildStartedUiEvent = (
  event: BrowserChatEvent
): event is ToolUiEvent<
  typeof DASHBOARD_BUILD_STARTED_UI_EVENT,
  DashboardBuildStartedUiEventData
> => isToolUiEvent(event, DASHBOARD_BUILD_STARTED_UI_EVENT);

const isPanelResolvedUiEvent = (
  event: BrowserChatEvent
): event is ToolUiEvent<
  typeof DASHBOARD_PANEL_RESOLVED_UI_EVENT,
  DashboardPanelResolvedUiEventData
> => isToolUiEvent(event, DASHBOARD_PANEL_RESOLVED_UI_EVENT);

const isBuildEndedUiEvent = (
  event: BrowserChatEvent
): event is ToolUiEvent<typeof DASHBOARD_BUILD_ENDED_UI_EVENT, DashboardBuildEndedUiEventData> =>
  isToolUiEvent(event, DASHBOARD_BUILD_ENDED_UI_EVENT);

/**
 * Creates a subscription that applies LLM-driven dashboard attachment updates
 * to the dashboard currently open in the app, as soon as the tool that made them finishes.
 */
export const createAgentLiveUpdatesSubscription = ({
  agentBuilder,
  api,
  upsertAttachment,
  getAttachments,
}: AgentLiveUpdatesSubscriptionParams): Subscription => {
  const liveBuild = createLiveBuild({ api });

  // A saved dashboard that differs from the attachment's linked dashboard is not built on.
  const isBuiltOnOpenDashboard = (attachmentId: string) => {
    const currentSavedObjectId = api.savedObjectId$.getValue();
    return (
      !currentSavedObjectId ||
      getAttachments()?.find(({ id }) => id === attachmentId)?.origin === currentSavedObjectId
    );
  };

  const subscription = agentBuilder.events.ui.activeConversation$
    .pipe(
      switchMap((conversation) =>
        conversation?.id ? agentBuilder.events.getChatEvents$(conversation.id) : EMPTY
      )
    )
    .subscribe((event) => {
      if (isBuildStartedUiEvent(event)) {
        const { attachmentId, panels, title } = event.data.data;
        if (isBuiltOnOpenDashboard(attachmentId)) liveBuild.start({ planned: panels, title });
        return;
      }
      if (isPanelResolvedUiEvent(event)) {
        liveBuild.resolvePanel(event.data.data);
        return;
      }
      if (isBuildEndedUiEvent(event)) {
        liveBuild.end();
        return;
      }
      if (!isDashboardUpdatedUiEvent(event)) return;

      const {
        data: { attachment },
      } = event.data;

      upsertAttachment(attachment);

      const currentSavedObjectId = api.savedObjectId$.getValue();
      if (currentSavedObjectId && attachment.origin !== currentSavedObjectId) {
        liveBuild.finish();
        return;
      }

      liveBuild.finish();
      api.setState(attachmentDataToDashboardState(attachment.data), { changedBy: ['agent'] });
    });

  return subscription;
};

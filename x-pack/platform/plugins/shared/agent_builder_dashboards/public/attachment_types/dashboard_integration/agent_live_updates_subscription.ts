/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { concatMap, EMPTY, filter, map, switchMap, takeWhile, tap, type Subscription } from 'rxjs';
import { isToolUiEvent, type ToolUiEvent } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart, BrowserChatEvent } from '@kbn/agent-builder-browser';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_UPDATED_UI_EVENT, type DashboardUpdatedUiEventData } from '../../../common';
import type { ApplyAgentChangesOutcome } from './apply_agent_changes';

export interface AgentLiveUpdatesSubscriptionParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  /** Whether the open dashboard staged the attachment, which is left unlinked when the user can't edit it. */
  isStagedFromDashboard: (attachmentId: string) => boolean;
  upsertAttachment: (attachment: DashboardAttachment) => void;
  /** Applies an update of the open dashboard. Updates stop once it opens them in a new dashboard. */
  onOpenDashboardUpdated: (
    attachment: DashboardAttachment
  ) => Promise<ApplyAgentChangesOutcome | undefined>;
  /** Called instead of applying an update that belongs to another saved dashboard. */
  onOtherDashboardUpdated: (attachment: DashboardAttachment) => void;
}

const isDashboardUpdatedUiEvent = (
  event: BrowserChatEvent
): event is ToolUiEvent<typeof DASHBOARD_UPDATED_UI_EVENT, DashboardUpdatedUiEventData> =>
  isToolUiEvent(event, DASHBOARD_UPDATED_UI_EVENT);

/**
 * Creates a subscription that routes LLM-driven dashboard attachment updates to the dashboard
 * currently open in the app, as soon as the tool that made them finishes.
 */
export const createAgentLiveUpdatesSubscription = ({
  agentBuilder,
  api,
  isStagedFromDashboard,
  upsertAttachment,
  onOpenDashboardUpdated,
  onOtherDashboardUpdated,
}: AgentLiveUpdatesSubscriptionParams): Subscription => {
  const isOpenDashboardAttachment = ({ id, origin }: DashboardAttachment) => {
    const currentSavedObjectId = api.savedObjectId$.getValue();
    return (
      !currentSavedObjectId ||
      origin === currentSavedObjectId ||
      (!origin && isStagedFromDashboard(id))
    );
  };

  return agentBuilder.events.ui.activeConversation$
    .pipe(
      switchMap((conversation) =>
        conversation?.id ? agentBuilder.events.getChatEvents$(conversation.id) : EMPTY
      ),
      filter(isDashboardUpdatedUiEvent),
      map((event) => event.data.data.attachment),
      tap(upsertAttachment),
      filter((attachment) => {
        if (isOpenDashboardAttachment(attachment)) {
          return true;
        }
        onOtherDashboardUpdated(attachment);
        return false;
      }),
      // one update at a time, so updates that arrive while a new dashboard opens don't open more
      concatMap(onOpenDashboardUpdated),
      // the new dashboard replaces this one, which gets no more updates
      takeWhile((outcome) => outcome !== 'opened-new-dashboard')
    )
    .subscribe();
};

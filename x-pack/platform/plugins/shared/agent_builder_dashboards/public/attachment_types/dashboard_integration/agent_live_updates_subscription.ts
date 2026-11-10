/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY, filter, switchMap, type Subscription } from 'rxjs';
import { isToolUiEvent, type ToolUiEvent } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart, BrowserChatEvent } from '@kbn/agent-builder-browser';
import type { NotificationsStart } from '@kbn/core/public';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common';
import { attachmentDataToDashboardState } from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi, DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_UPDATED_UI_EVENT, type DashboardUpdatedUiEventData } from '../../../common';
import {
  APPLY_AGENT_CHANGES_ERROR_TITLE,
  applyAgentChangesToDashboard,
} from './apply_agent_changes';

export interface AgentLiveUpdatesSubscriptionParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  canWriteDashboards: boolean;
  dashboardLocator?: DashboardRendererProps['locator'];
  toasts: NotificationsStart['toasts'];
  /** Whether the open dashboard staged the attachment, which is left unlinked when the user can't edit it. */
  isStagedFromDashboard: (attachmentId: string) => boolean;
  /** Called instead of applying an update that belongs to another saved dashboard. */
  onOtherDashboardUpdated: (attachment: DashboardAttachment) => void;
  upsertAttachment: (attachment: DashboardAttachment) => void;
}

const isDashboardUpdatedUiEvent = (
  event: BrowserChatEvent
): event is ToolUiEvent<typeof DASHBOARD_UPDATED_UI_EVENT, DashboardUpdatedUiEventData> =>
  isToolUiEvent(event, DASHBOARD_UPDATED_UI_EVENT);

/**
 * Creates a subscription that applies LLM-driven dashboard attachment updates
 * to the dashboard currently open in the app, as soon as the tool that made them finishes.
 */
export const createAgentLiveUpdatesSubscription = ({
  agentBuilder,
  api,
  canWriteDashboards,
  dashboardLocator,
  toasts,
  isStagedFromDashboard,
  onOtherDashboardUpdated,
  upsertAttachment,
}: AgentLiveUpdatesSubscriptionParams): Subscription => {
  // the open dashboard stays until the new one replaces it, so later updates would open more of them
  let isOpeningNewDashboard = false;
  let hasWarnedAboutWritePermission = false;

  return agentBuilder.events.ui.activeConversation$
    .pipe(
      switchMap((conversation) =>
        conversation?.id ? agentBuilder.events.getChatEvents$(conversation.id) : EMPTY
      ),
      filter(isDashboardUpdatedUiEvent)
    )
    .subscribe((event) => {
      const {
        data: { attachment },
      } = event.data;

      upsertAttachment(attachment);

      const currentSavedObjectId = api.savedObjectId$.getValue();
      const isOwnAttachment =
        attachment.origin === currentSavedObjectId ||
        (!attachment.origin && isStagedFromDashboard(attachment.id));

      // Skip if viewing a saved dashboard that differs from the attachment's linked dashboard
      if (currentSavedObjectId && !isOwnAttachment) {
        // without write access, opening it would show unsaved changes that look saved
        if (canWriteDashboards) {
          onOtherDashboardUpdated(attachment);
        }
        return;
      }

      if (isOpeningNewDashboard || (!canWriteDashboards && hasWarnedAboutWritePermission)) {
        return;
      }
      hasWarnedAboutWritePermission = !canWriteDashboards;

      applyAgentChangesToDashboard({
        api,
        dashboardState: attachmentDataToDashboardState(attachment.data),
        canWriteDashboards,
        dashboardLocator,
        toasts,
        onOpenInNewDashboard: () => {
          isOpeningNewDashboard = true;
        },
      }).catch((error: Error) => {
        isOpeningNewDashboard = false;
        toasts.addError(error, { title: APPLY_AGENT_CHANGES_ERROR_TITLE });
      });
    });
};

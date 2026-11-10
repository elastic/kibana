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
  canApplyAgentChangesInPlace,
} from './apply_agent_changes';

export interface AgentLiveUpdatesSubscriptionParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  canWriteDashboards: boolean;
  dashboardLocator?: DashboardRendererProps['locator'];
  toasts: NotificationsStart['toasts'];
  /** The attachment whose changes opened this dashboard as a new one. */
  linkedAttachmentId?: string;
  linkNextDashboard: (attachmentId: string) => void;
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
  linkedAttachmentId,
  linkNextDashboard,
  onOtherDashboardUpdated,
  upsertAttachment,
}: AgentLiveUpdatesSubscriptionParams): Subscription =>
  agentBuilder.events.ui.activeConversation$
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
      // Attachments staged from a dashboard the user can't edit are left unlinked
      const isOwnAttachment =
        attachment.id === linkedAttachmentId ||
        attachment.origin === currentSavedObjectId ||
        (!attachment.origin && !canApplyAgentChangesInPlace(api, canWriteDashboards));

      // Skip if viewing a saved dashboard that differs from the attachment's linked dashboard
      if (currentSavedObjectId && !isOwnAttachment) {
        // without write access, opening it would show unsaved changes that look saved
        if (canWriteDashboards) {
          onOtherDashboardUpdated(attachment);
        }
        return;
      }

      applyAgentChangesToDashboard({
        api,
        dashboardState: attachmentDataToDashboardState(attachment.data),
        canWriteDashboards,
        dashboardLocator,
        toasts,
        onOpenInNewDashboard: () => linkNextDashboard(attachment.id),
      }).catch((error: Error) =>
        toasts.addError(error, { title: APPLY_AGENT_CHANGES_ERROR_TITLE })
      );
    });

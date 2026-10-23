/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY, filter, switchMap, type Subscription } from 'rxjs';
import { isToolUiEvent, type ToolUiEvent } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart, BrowserChatEvent } from '@kbn/agent-builder-browser';
import type { DashboardAttachment } from '@kbn/agent-builder-dashboards-common';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { DASHBOARD_UPDATED_UI_EVENT, type DashboardUpdatedUiEventData } from '../../../common';
import { applyAttachmentToDashboard } from './apply_attachment';
import type { AppliedAttachmentsStore } from './applied_attachments_store';
import { canShowAttachmentInDashboard } from './linked_attachment';

export interface AgentLiveUpdatesSubscriptionParams {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
  appliedAttachments: AppliedAttachmentsStore;
  upsertAttachment: (attachment: DashboardAttachment) => void;
  /** Called instead of applying an update that belongs to another dashboard. */
  onOtherDashboardUpdated: (attachment: DashboardAttachment) => void;
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
  appliedAttachments,
  upsertAttachment,
  onOtherDashboardUpdated,
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

      if (!canShowAttachmentInDashboard({ api, store: appliedAttachments, attachment })) {
        onOtherDashboardUpdated(attachment);
        return;
      }

      void applyAttachmentToDashboard({ store: appliedAttachments, api, attachment });
    });

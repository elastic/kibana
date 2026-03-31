/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { createAgentLiveUpdatesSubscription } from './agent_live_updates_subscription';
import { createDashboardAttachmentSessionController } from './dashboard_attachment_session_controller';
import { createManualChangesSubscription } from './manual_changes_subscription';

export const registerDashboardAppIntegration = ({
  agentBuilder,
  api,
}: {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
}): (() => void) => {
  const sessionController = createDashboardAttachmentSessionController({
    api,
    agentBuilder,
  });

  const agentLiveUpdatesSubscription = createAgentLiveUpdatesSubscription({
    agentBuilder,
    api,
  });

  const manualChangesSubscription = createManualChangesSubscription({
    agentBuilder,
    api,
    getAttachment: sessionController.getCurrentAttachment,
  });

  agentBuilder.setChatConfig({
    onConversationChange: ({ id: conversationId, attachments }) => {
      sessionController.handleConversationChange({ conversationId, attachments });
    },
  });

  return () => {
    sessionController.cleanup();
    agentLiveUpdatesSubscription.unsubscribe();
    manualChangesSubscription.unsubscribe();
    agentBuilder.clearChatConfig();
  };
};

export const createDashboardAppIntegration$ = ({
  agentBuilder,
  api,
}: {
  agentBuilder: AgentBuilderPluginStart;
  api: DashboardApi;
}): Observable<never> =>
  new Observable<never>(() => registerDashboardAppIntegration({ agentBuilder, api }));

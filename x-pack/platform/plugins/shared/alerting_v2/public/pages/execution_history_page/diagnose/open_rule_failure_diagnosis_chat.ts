/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import {
  isConversationCreatedEvent,
  isConversationIdSetEvent,
} from '@kbn/agent-builder-common/chat/events';
import { i18n } from '@kbn/i18n';
import type { RuleDiagnosisContext } from './build_rule_diagnosis_handoff';
import { buildRuleDiagnosisHandoffPayload } from './build_rule_diagnosis_handoff';

const renamePath = (conversationId: string) =>
  `/internal/agent_builder/conversations/${conversationId}/_rename`;

export interface OpenRuleFailureDiagnosisChatParams {
  agentBuilder: AgentBuilderPluginStart;
  http: HttpStart;
  context: RuleDiagnosisContext;
}

/**
 * Open Agent Builder with the diagnosis attachments and auto-submit the skill-invoking prompt.
 * Best-effort rename after the conversation id is assigned (`openChat` has no title option).
 */
export const openRuleFailureDiagnosisChat = ({
  agentBuilder,
  http,
  context,
}: OpenRuleFailureDiagnosisChatParams): void => {
  const payload = buildRuleDiagnosisHandoffPayload(context);

  let renamed = false;
  const tryRename = (conversationId: string) => {
    if (renamed || !conversationId) {
      return;
    }
    renamed = true;
    void http
      .post(renamePath(conversationId), {
        body: JSON.stringify({ title: payload.conversationTitle }),
      })
      .catch(() => {
        // `openChat` does not accept a title yet; the rename is best-effort.
      });
  };

  const subscription = agentBuilder.events.chat$.subscribe((event) => {
    if (isConversationIdSetEvent(event) || isConversationCreatedEvent(event)) {
      tryRename(event.data.conversation_id);
      subscription.unsubscribe();
    }
  });

  agentBuilder.openChat({
    newConversation: true,
    sessionTag: payload.sessionTag,
    attachments: payload.attachments,
    initialMessage: payload.initialMessage,
    autoSendInitialMessage: true,
  });
};

export const diagnoseHandoffErrorToastTitle = (): string =>
  i18n.translate('xpack.alertingV2.executionHistory.rulesTab.diagnose.handoffErrorTitle', {
    defaultMessage: 'Unable to start AI diagnosis',
  });

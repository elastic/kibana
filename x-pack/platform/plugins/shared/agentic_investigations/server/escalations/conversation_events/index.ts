/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import {
  ESCALATION_CREATED_FROM_INVESTIGATION_EVENT_TYPE,
  ESCALATION_INVESTIGATION_LINKED_EVENT_TYPE,
  escalationInvestigationEventSchema,
} from '../../../common/escalations/conversation_events';

/**
 * Registers the escalation timeline event types. They are UI-only: without a `format` they are
 * never shown to the LLM.
 */
export const registerEscalationConversationEvents = (
  agentBuilder: AgentBuilderPluginSetup
): void => {
  for (const type of [
    ESCALATION_CREATED_FROM_INVESTIGATION_EVENT_TYPE,
    ESCALATION_INVESTIGATION_LINKED_EVENT_TYPE,
  ] as const) {
    agentBuilder.conversationEvents.register({
      type,
      payloadSchema: escalationInvestigationEventSchema,
    });
  }
};

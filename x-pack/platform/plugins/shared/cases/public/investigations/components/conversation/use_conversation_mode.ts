/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationRecord } from '../../../../common/investigations/types';
import { useCapabilities } from '../../hooks';
import { useInvestigationsServices } from '../../services';
import * as i18n from './translations';

export type ConversationMode =
  /** The embedded Agent Builder conversation. */
  | { mode: 'agent'; conversationId: string }
  /** A discussion between people, with the reason the agent is not part of it. */
  | { mode: 'team'; explanation: string };

/**
 * Whether the record's conversation is the agent conversation or a team discussion. The agent
 * conversation needs an AI-enabled record, a licence and Agent Builder access, the Agent Builder
 * browser contract and a main conversation.
 */
export const useConversationMode = (
  record: InvestigationRecord,
  agentAvailable: boolean
): ConversationMode => {
  const { agentBuilder } = useInvestigationsServices();
  const { data: capabilities } = useCapabilities();

  if (!record.ai_enabled) {
    return { mode: 'team', explanation: i18n.NO_AGENTS_ENABLED };
  }
  if (!agentAvailable || !agentBuilder) {
    const reason =
      capabilities?.reason && capabilities.reason.length > 0
        ? capabilities.reason
        : i18n.REASON_NO_ACCESS;
    return { mode: 'team', explanation: i18n.AGENT_BUILDER_UNAVAILABLE(reason) };
  }
  if (!record.conversation_id) {
    return {
      mode: 'team',
      explanation: i18n.AGENT_BUILDER_UNAVAILABLE(i18n.REASON_NO_CONVERSATION),
    };
  }
  return { mode: 'agent', conversationId: record.conversation_id };
};

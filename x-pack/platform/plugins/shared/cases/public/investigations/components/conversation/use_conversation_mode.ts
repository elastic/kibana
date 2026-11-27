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
  /** The embedded Agent Builder conversation (people can skip the agent per message). */
  | { mode: 'agent'; conversationId: string }
  /** Agent Builder is available but the record predates its conversation: create it. */
  | { mode: 'missing' }
  /** Agent Builder is not available to this user, so there is no conversation to show. */
  | { mode: 'unavailable'; explanation: string }
  /** Still finding out whether Agent Builder is available. */
  | { mode: 'checking' };

/** The Conversation tab and side chat are always the Agent Builder conversation. */
export const useConversationMode = (
  record: InvestigationRecord,
  agentAvailable: boolean
): ConversationMode => {
  const { agentBuilder } = useInvestigationsServices();
  const { data: capabilities, isLoading } = useCapabilities();

  // `agentAvailable` is false when the agent is off for this record, but people still talk in the
  // conversation then, so only Agent Builder's own availability decides.
  if (isLoading && !agentAvailable) {
    return { mode: 'checking' };
  }
  const builderAvailable = agentAvailable || capabilities?.agent_builder_available === true;
  if (!builderAvailable || !agentBuilder) {
    const reason =
      capabilities?.reason && capabilities.reason.length > 0
        ? capabilities.reason
        : i18n.REASON_NO_ACCESS;
    return { mode: 'unavailable', explanation: i18n.AGENT_BUILDER_UNAVAILABLE(reason) };
  }
  if (!record.conversation_id) {
    return { mode: 'missing' };
  }
  return { mode: 'agent', conversationId: record.conversation_id };
};

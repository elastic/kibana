/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { INVESTIGATION_AGENT_ID } from '../../../../common/investigations/types';
import { investigationKeys } from '../../api/query_keys';
import { useInvestigationToasts } from '../../hooks';
import { useInvestigationsServices } from '../../services';
import { converse, getAgentConversation } from './conversation_api';
import type { AgentConversation } from './conversation_api';
import { buildMessages } from './messages';
import type { ConversationMessage } from './messages';
import * as i18n from './translations';

const CONVERSATION_STALE_MS = 3000;

/** Under the record scope, so the live poller refreshes it whenever the record changes. */
const conversationKey = (recordId: string, conversationId: string) =>
  [...investigationKeys.recordScope(recordId), 'conversation', conversationId] as const;

export const useConversation = (
  recordId: string,
  conversationId: string | null | undefined,
  options?: { enabled?: boolean }
) => {
  const { http } = useInvestigationsServices();

  return useQuery(
    conversationKey(recordId, conversationId ?? ''),
    () => getAgentConversation(http, conversationId ?? ''),
    {
      enabled: (options?.enabled ?? true) && Boolean(conversationId),
      staleTime: CONVERSATION_STALE_MS,
      retry: false,
    }
  );
};

export interface UseConversationMessagesResult {
  conversation: AgentConversation | undefined;
  messages: ConversationMessage[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** The messages of one conversation as people see them (digest removed, skip-agent messages included). */
export const useConversationMessages = (
  record: InvestigationRecord,
  conversationId: string | null | undefined,
  options?: { enabled?: boolean }
): UseConversationMessagesResult => {
  const { data, isLoading, error, refetch } = useConversation(record.id, conversationId, options);
  const { participants, agent_name: agentName } = record;
  const messages = useMemo(
    () => (data ? buildMessages(data, { participants, agent_name: agentName }) : []),
    [data, participants, agentName]
  );

  return { conversation: data, messages, isLoading, error, refetch: () => void refetch() };
};

/**
 * The number of messages of the main conversation (user messages and agent responses), cached
 * and refreshed with the record. `undefined` until it is known, or when there is no conversation.
 */
export const useConversationMessageCount = (
  record: InvestigationRecord
): { count: number | undefined; isLoading: boolean } => {
  const { messages, isLoading, conversation } = useConversationMessages(
    record,
    record.conversation_id
  );

  return {
    count: conversation ? messages.length : undefined,
    isLoading,
  };
};

/** Asks the agent to summarise a thread. The summary becomes the last message of the thread. */
export const useSummarizeThread = (record: InvestigationRecord) => {
  const { http } = useInvestigationsServices();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useInvestigationToasts();

  return useMutation(
    (conversationId: string) =>
      converse(http, {
        agentId: record.agent_id ?? INVESTIGATION_AGENT_ID,
        conversationId,
        input: i18n.THREAD_SUMMARY_PROMPT,
        triggerMode: 'always',
      }),
    {
      onSuccess: () => {
        showSuccess(i18n.THREAD_SUMMARY_SENT);
        void queryClient.invalidateQueries(investigationKeys.recordScope(record.id));
      },
      onError: (error) => showError(error, i18n.THREAD_SUMMARY_ERROR),
    }
  );
};

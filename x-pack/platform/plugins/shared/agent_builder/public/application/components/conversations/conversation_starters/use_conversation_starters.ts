/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { ConversationStarter } from '@kbn/agent-builder-common';
import { useResolvedAgent } from '../../../hooks/agents/use_resolved_agent';
import { useAgentId } from '../../../hooks/use_conversation';
import { useSubmitMessage } from '../../../hooks/use_submit_message';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';
import { useAgentModel } from '../../../hooks/agents/use_agent_model';
import { useCurrentUser } from '../../../hooks/use_current_user';
import { useCarryOverDraft } from '../../../hooks/use_input_draft';
import { useActiveSpaceId } from '../../../context/active_space_context';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { resolveConversationStarters } from './resolve_conversation_starters';

// TEMP, visual check only, remove before committing: hardcoded starters instead of the agent's.
// Pick short, prompts, mixed or one below, or set TEMP_HARDCODED_STARTERS to undefined to turn it off.
const TEMP_STARTERS = {
  short: [
    { label: 'Investigate latency spike' },
    { label: 'Summarize suspicious logins' },
    { label: 'Failed logins by country' },
  ],
  prompts: [
    {
      label: 'Top errors',
      prompt: 'Show me the top 10 errors from the last 24 hours grouped by service',
    },
    {
      label: 'Suspicious logins',
      prompt: 'Summarize suspicious login activity from the past 24 hours in a dashboard',
    },
    { label: 'Failed logins by country' },
  ],
  mixed: [{ label: 'Investigate latency spike' }, { label: 'A label of exactly 30 characters' }],
  one: [{ label: 'Investigate latency spike' }],
};
const TEMP_HARDCODED_STARTERS: { label: string; prompt?: string }[] | undefined =
  TEMP_STARTERS.prompts;

/**
 * The starters to show for the selected agent, and how to send one. Nothing is returned while the
 * agent loads or when the user can't run it, so starters never appear for an input that can't send.
 */
export const useConversationStarters = () => {
  const agentId = useAgentId();
  const { agent, isLoading } = useResolvedAgent(agentId);
  const { submitMessage, isCreatingConversation } = useSubmitMessage();
  const { invokeBoundAgents } = useUiPrivileges();
  const { isLoading: isAgentModelLoading } = useAgentModel(agentId);
  const spaceId = useActiveSpaceId();
  const { sessionTag } = useConversationContext();
  const { currentUser } = useCurrentUser();
  const { takeNewChatDraft, saveDraftTo } = useCarryOverDraft({
    spaceId,
    sessionTag,
    username: currentUser?.user.username,
    agentId,
  });

  const isBoundAgentForbidden = Boolean(agent?.service_account_id) && !invokeBoundAgents;
  // TEMP: the hardcoded starters also skip the agent checks, to see where the cards stop showing.
  const canSend =
    TEMP_HARDCODED_STARTERS !== undefined ||
    (Boolean(agent) && !isLoading && !isBoundAgentForbidden);
  const agentStarters = TEMP_HARDCODED_STARTERS ?? agent?.conversation_starters;

  const starters = useMemo(
    () => (canSend ? resolveConversationStarters({ agentStarters }) : []),
    [canSend, agentStarters]
  );

  const onSelect = useCallback(
    ({ label, prompt }: ConversationStarter) => {
      // What was typed isn't sent: it moves to the input of the conversation that starts.
      const typedText = takeNewChatDraft();
      void submitMessage(prompt ?? label, {
        onConversationCreated: (conversationId) => {
          if (typedText) saveDraftTo(conversationId, typedText);
        },
      });
    },
    [takeNewChatDraft, saveDraftTo, submitMessage]
  );

  return { starters, onSelect, isDisabled: isCreatingConversation || isAgentModelLoading };
};

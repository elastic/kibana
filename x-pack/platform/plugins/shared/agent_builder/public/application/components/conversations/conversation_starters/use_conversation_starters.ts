/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import { useCallback, useMemo } from 'react';
import type { ConversationStarter } from '@kbn/agent-builder-common';
import { useAgentId } from '../../../hooks/use_conversation';
import { useSubmitMessage } from '../../../hooks/use_submit_message';
import { useAgentSendState } from '../../../hooks/agents/use_agent_send_state';
import { useCurrentUser } from '../../../hooks/use_current_user';
import { useCarryOverDraft } from '../../../hooks/use_input_draft';
import { useActiveSpaceId } from '../../../context/active_space_context';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import type { TakeInputDraft } from '../conversation_input/conversation_input';
import { resolveConversationStarters } from './resolve_conversation_starters';

/**
 * The starters to show for the selected agent, and how to send one. Nothing is returned while the
 * agent loads or when the user can't run it, so starters never appear for an input that can't send.
 */
export const useConversationStarters = ({
  isInputUploading = false,
  takeInputDraftRef,
}: {
  isInputUploading?: boolean;
  takeInputDraftRef?: MutableRefObject<TakeInputDraft | null>;
} = {}) => {
  const agentId = useAgentId();
  const { submitMessage, isCreatingConversation } = useSubmitMessage();
  const { agent, agentExists, isBoundAgentForbidden, isAgentModelLoading } =
    useAgentSendState(agentId);
  const spaceId = useActiveSpaceId();
  const { sessionTag } = useConversationContext();
  const { currentUser } = useCurrentUser();
  const { takeNewChatDraft, saveDraftTo } = useCarryOverDraft({
    spaceId,
    sessionTag,
    username: currentUser?.user.username,
    agentId,
  });

  const canSend = agentExists && !isBoundAgentForbidden;
  const agentStarters = agent?.conversation_starters;

  const starters = useMemo(
    () => (canSend ? resolveConversationStarters({ agentStarters }) : []),
    [canSend, agentStarters]
  );

  const onSelect = useCallback(
    ({ label }: ConversationStarter) => {
      void submitMessage(label, {
        // What was typed isn't sent: it moves to the input of the conversation that starts. It stays
        // where it is if the conversation can't be created.
        onConversationCreated: (conversationId) => {
          const typedText = takeInputDraftRef?.current
            ? takeInputDraftRef.current()
            : takeNewChatDraft();
          if (typedText) saveDraftTo(conversationId, typedText);
        },
      });
    },
    [takeInputDraftRef, takeNewChatDraft, saveDraftTo, submitMessage]
  );

  return {
    starters,
    onSelect,
    isDisabled: isCreatingConversation || isAgentModelLoading || isInputUploading,
  };
};

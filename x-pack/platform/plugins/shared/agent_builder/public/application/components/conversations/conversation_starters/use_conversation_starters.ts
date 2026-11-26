/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { ConversationStarter } from '@kbn/agent-builder-common';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { SolutionView } from '@kbn/spaces-plugin/common';
import { useAgentId } from '../../../hooks/use_conversation';
import { useAgentModel } from '../../../hooks/agents/use_agent_model';
import { useSubmitMessage } from '../../../hooks/use_submit_message';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { DEFAULT_CONVERSATION_STARTERS } from './default_conversation_starters';
import type { ResolvedConversationStarters } from './resolve_conversation_starters';
import { resolveConversationStarters } from './resolve_conversation_starters';
import { getSolutionConversationStarters } from './solution_conversation_starters';

const NO_STARTERS: ResolvedConversationStarters = { starters: [], source: 'default' };

/**
 * The starters to show, and how to send one: those the app passed in its chat config, or else those
 * of the solution of the space, or else the default list. They are shown for the default Elastic AI
 * agent only. The lists of the solution and the default one also wait for the solution to be known.
 * A click sends the prompt of the starter, or its label when it has none, as the message, which
 * creates the conversation and moves the user to it.
 */
export const useConversationStarters = ({
  solution,
}: {
  /** The solution of the current space, `undefined` while it is loading. */
  solution?: SolutionView;
} = {}) => {
  const agentId = useAgentId();
  const { submitMessage, isCreatingConversation } = useSubmitMessage();
  const { isLoading: isAgentModelLoading } = useAgentModel(agentId);
  const { conversationStarters: appStarters } = useConversationContext();

  const isDefaultAgent = agentId === agentBuilderDefaultAgentId;
  const canShowBuiltInStarters = solution !== undefined;

  const { starters, source } = useMemo(
    () =>
      isDefaultAgent
        ? resolveConversationStarters({
            appStarters,
            solutionStarters: canShowBuiltInStarters
              ? getSolutionConversationStarters(solution)
              : undefined,
            defaultStarters: canShowBuiltInStarters ? DEFAULT_CONVERSATION_STARTERS : undefined,
          })
        : NO_STARTERS,
    [isDefaultAgent, appStarters, canShowBuiltInStarters, solution]
  );

  const onSelect = useCallback(
    ({ label, prompt }: ConversationStarter) => {
      void submitMessage(prompt ?? label);
    },
    [submitMessage]
  );

  return {
    starters,
    source,
    onSelect,
    isDisabled: isCreatingConversation || isAgentModelLoading,
  };
};

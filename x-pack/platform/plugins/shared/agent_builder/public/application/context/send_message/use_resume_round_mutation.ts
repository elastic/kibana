/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { useRef, useState, useMemo } from 'react';
import { toToolMetadata } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useAgentId } from '../../hooks/use_conversation';
import { useConversationContext } from '../conversation/conversation_context';
import { useConversationId } from '../conversation/use_conversation_id';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { mutationKeys } from '../../mutation_keys';
import { useSubscribeToChatEvents } from './use_subscribe_to_chat_events';
import { BrowserToolExecutor } from '../../services/browser_tool_executor';

interface UseResumeRoundMutationProps {
  connectorId?: string;
}

export const useResumeRoundMutation = ({ connectorId }: UseResumeRoundMutationProps = {}) => {
  const { chatService } = useAgentBuilderServices();
  const { services } = useKibana();
  const { conversationActions, browserApiTools } = useConversationContext();
  const [isResuming, setIsResuming] = useState(false);
  const [agentReasoning, setAgentReasoning] = useState<string | null>(null);
  const conversationId = useConversationId();
  const agentId = useAgentId();
  const resumeControllerRef = useRef<AbortController | null>(null);

  const browserApiToolsMetadata = useMemo(() => {
    if (!browserApiTools) return undefined;
    return browserApiTools.map(toToolMetadata);
  }, [browserApiTools]);

  const browserToolExecutor = useMemo(() => {
    return new BrowserToolExecutor(services.notifications?.toasts);
  }, [services.notifications?.toasts]);

  const { subscribeToChatEvents } = useSubscribeToChatEvents({
    setAgentReasoning,
    setIsResponseLoading: setIsResuming,
    isAborted: () => Boolean(resumeControllerRef?.current?.signal?.aborted),
    browserToolExecutor,
  });

  const resumeRound = async ({ promptId, confirm }: { promptId: string; confirm: boolean }) => {
    const signal = resumeControllerRef.current?.signal;
    if (!signal) {
      return Promise.reject(new Error('Abort signal not present'));
    }

    if (!conversationId) {
      return Promise.reject(new Error('Conversation ID is required to resume a round'));
    }

    const events$ = chatService.resume({
      signal,
      prompts: {
        [promptId]: { allow: confirm },
      },
      conversationId,
      agentId,
      connectorId,
      browserApiTools: browserApiToolsMetadata,
    });

    return subscribeToChatEvents(events$);
  };

  const { mutate, isLoading } = useMutation({
    mutationKey: mutationKeys.resumeRound,
    mutationFn: resumeRound,
    onMutate: () => {
      resumeControllerRef.current = new AbortController();
      // Clear the pending prompt from the round - we're now processing
      conversationActions.clearPendingPrompt();
      setIsResuming(true);
    },
    onSettled: () => {
      conversationActions.invalidateConversation();
      resumeControllerRef.current = null;
      setAgentReasoning(null);
      setIsResuming(false);
    },
    onError: (err) => {},
  });

  return {
    resumeRound: mutate,
    isResuming: isLoading || isResuming,
    agentReasoning,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { toToolMetadata } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ConversationRoundStep } from '@kbn/agent-builder-common';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { mutationKeys } from '../../mutation_keys';
import { subscribeToChatEvents } from './use_subscribe_to_chat_events';
import { BrowserToolExecutor } from '../../services/browser_tool_executor';
import { createConversationActions } from '../conversation/use_conversation_actions';

export interface ResumeRoundVars {
  prompts: Record<string, { allow: boolean }>;
  conversationId: string;
  agentId: string;
  connectorId?: string;
  lastRoundSteps?: ConversationRoundStep[];
  browserApiTools?: Array<BrowserApiToolDefinition<any>>;
}

export interface ResumeRoundMutationBindings {
  updateActiveReasoning: (reasoning: string) => void;
  setError: (conversationId: string, error: unknown, errorSteps: ConversationRoundStep[]) => void;
  clearActiveStream: () => void;
}

type UseResumeRoundMutationProps = ResumeRoundMutationBindings;

/**
 * Resume mutation, used after a HITL pause when the user clicks Approve / Cancel on a
 * `ConfirmationPrompt`. Same single-scope `mutationFn` shape as the send mutation.
 */
export const useResumeRoundMutation = ({
  updateActiveReasoning,
  setError,
  clearActiveStream,
}: UseResumeRoundMutationProps) => {
  const { chatService, conversationsService } = useAgentBuilderServices();
  const { services } = useKibana();
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  const browserToolExecutor = useMemo(() => {
    return new BrowserToolExecutor(services.notifications?.toasts);
  }, [services.notifications?.toasts]);

  const { mutate, isLoading } = useMutation({
    mutationKey: mutationKeys.resumeRound,
    mutationFn: async (vars: ResumeRoundVars) => {
      const streamActions = createConversationActions({
        conversationId: vars.conversationId,
        queryClient,
        conversationsService,
      });

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Drop pending prompts from the round — the user has answered, the round is back in progress.
      streamActions.clearPendingPrompts();

      let succeeded = false;
      try {
        const browserApiToolsMetadata = vars.browserApiTools?.map(toToolMetadata);

        const events$ = chatService.resume({
          signal: controller.signal,
          prompts: vars.prompts,
          conversationId: vars.conversationId,
          agentId: vars.agentId,
          connectorId: vars.connectorId,
          browserApiTools: browserApiToolsMetadata,
        });

        await subscribeToChatEvents({
          events$,
          conversationActions: streamActions,
          browserApiTools: vars.browserApiTools,
          browserToolExecutor,
          isAborted: () => controller.signal.aborted,
          setAgentReasoning: updateActiveReasoning,
        });
        succeeded = true;
      } catch (err) {
        setError(vars.conversationId, err, vars.lastRoundSteps ?? []);
        throw err;
      } finally {
        // Only invalidate on success — see use_send_message_mutation.ts for rationale.
        if (succeeded) {
          streamActions.invalidateConversation();
        }
        clearActiveStream();
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
  });

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    mutate,
    isLoading,
    cancel,
  };
};

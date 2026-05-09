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
import { firstValueFrom } from 'rxjs';
import { isEqual } from 'lodash';
import type {
  ConversationAction,
  ConversationRoundStep,
  Conversation,
} from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import type {
  Attachment,
  AttachmentInput,
  ScreenContextAttachmentData,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { AttachmentType, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { queryKeys } from '../../query_keys';
import { useKibana } from '../../hooks/use_kibana';
import type { StartServices } from '../../hooks/use_kibana';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { mutationKeys } from '../../mutation_keys';
import { subscribeToChatEvents } from './use_subscribe_to_chat_events';
import { BrowserToolExecutor } from '../../services/browser_tool_executor';
import { createConversationActions } from '../conversation/use_conversation_actions';

const SCREEN_CONTEXT_ATTACHMENT_ID = 'screen-context';

export interface SendMessageVars {
  message?: string;
  action?: ConversationAction;
  conversationId: string;
  agentId: string;
  connectorId?: string;
  attachments?: AttachmentInput[];
  conversationAttachments?: VersionedAttachment[];
  lastRoundSteps?: ConversationRoundStep[];
  resetAttachments?: () => void;
  browserApiTools?: Array<BrowserApiToolDefinition<any>>;
}

export interface SendMessageMutationBindings {
  updateActiveReasoning: (conversationId: string, reasoning: string) => void;
  setPendingMessage: (conversationId: string, message: string) => void;
  clearPendingMessage: (conversationId: string) => void;
  setError: (conversationId: string, error: unknown, errorSteps: ConversationRoundStep[]) => void;
  clearError: (conversationId: string) => void;
  clearActiveStream: (conversationId: string) => void;
}

type UseSendMessageMutationProps = SendMessageMutationBindings;

const buildScreenContextData = async ({
  services,
}: {
  services: StartServices;
}): Promise<ScreenContextAttachmentData | undefined> => {
  const url = window.location.href;
  const app = await firstValueFrom(services.application.currentAppId$);
  const timefilter = services.plugins.data?.query.timefilter.timefilter;
  const time = timefilter?.getTime();
  const timeRange =
    time?.from && time?.to ? { from: String(time.from), to: String(time.to) } : undefined;

  const data: ScreenContextAttachmentData = {
    ...(url ? { url } : {}),
    ...(app ? { app } : {}),
    ...(timeRange ? { time_range: timeRange } : {}),
  };

  if (!data.url && !data.app && !data.time_range) {
    return undefined;
  }

  return data;
};

const withScreenContextAttachment = async ({
  services,
  conversationAttachments,
}: {
  services: StartServices;
  conversationAttachments?: VersionedAttachment[];
}): Promise<Attachment[]> => {
  const data = await buildScreenContextData({ services });
  if (!data) {
    return [];
  }

  const existing = conversationAttachments?.find((attachment) => {
    return attachment.type === AttachmentType.screenContext;
  });

  const latest = existing ? getLatestVersion(existing) : undefined;
  if (latest?.data && isEqual(latest.data, data)) {
    return [];
  }

  return [
    {
      id: existing?.id ?? SCREEN_CONTEXT_ATTACHMENT_ID,
      type: AttachmentType.screenContext,
      data: data as Record<string, unknown>,
      hidden: true,
    },
  ];
};

/**
 * Send and regenerate-round mutation. Lives in the lifted SendMessageProvider so streaming
 * state is visible to the whole app (sidebar included).
 *
 * Single-scope `mutationFn` (setup → try → catch → finally) — no `onMutate` / `onSettled`
 * lifecycle methods, no refs to bridge phases. Each invocation builds its own
 * `streamActions` instance targeting `vars.conversationId`, so stream events keep writing
 * to the right cache regardless of where the user has navigated.
 */
export const useSendMessageMutation = ({
  updateActiveReasoning,
  setPendingMessage,
  clearPendingMessage,
  setError,
  clearError,
  clearActiveStream,
}: UseSendMessageMutationProps) => {
  const { chatService, conversationsService } = useAgentBuilderServices();
  const { services } = useKibana();
  const queryClient = useQueryClient();
  // One controller per in-flight conversation. Concurrent streams need independent cancel.
  // `useSendMessageMutation` is called exactly once — by  the `SendMessageProvider`.
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  const browserToolExecutor = useMemo(() => {
    return new BrowserToolExecutor(services.notifications?.toasts);
  }, [services.notifications?.toasts]);

  const { mutate, isLoading } = useMutation({
    mutationKey: mutationKeys.sendMessage,
    mutationFn: async (vars: SendMessageVars) => {
      const isRegenerate = vars.action === 'regenerate';

      // Clear any previous error for this conversation before starting the new mutation.
      // Covers retry, fresh-send-after-error, and regenerate-after-error uniformly —
      // otherwise `useConversationRounds` would render the stale error round alongside
      // the new optimistic round.
      clearError(vars.conversationId);

      // Each conversation owns its streaming lifecycle. The streamActions instance built
      // here is closure-bound to vars.conversationId for the duration of this mutation —
      // stream events target that conversation regardless of navigation.
      const streamActions = createConversationActions({
        conversationId: vars.conversationId,
        queryClient,
        conversationsService,
      });

      controllersRef.current.get(vars.conversationId)?.abort();
      const controller = new AbortController();
      controllersRef.current.set(vars.conversationId, controller);

      if (isRegenerate) {
        // Clear the existing response immediately so UI shows empty state.
        streamActions.clearLastRoundResponse();
      } else {
        if (!vars.message) {
          throw new Error('Message is required');
        }
        setPendingMessage(vars.conversationId, vars.message);
        streamActions.addOptimisticRound({
          userMessage: vars.message,
          attachments: vars.attachments ?? [],
          agentId: vars.agentId,
        });
      }

      let succeeded = false;
      try {
        const browserApiToolsMetadata = vars.browserApiTools?.map(toToolMetadata);

        const events$ = isRegenerate
          ? chatService.regenerate({
              signal: controller.signal,
              conversationId: vars.conversationId,
              agentId: vars.agentId,
              connectorId: vars.connectorId,
              browserApiTools: browserApiToolsMetadata,
            })
          : chatService.chat({
              signal: controller.signal,
              input: vars.message!,
              conversationId: vars.conversationId,
              agentId: vars.agentId,
              connectorId: vars.connectorId,
              attachments: [
                ...(vars.attachments ?? []),
                ...(await withScreenContextAttachment({
                  services,
                  conversationAttachments: vars.conversationAttachments,
                })),
              ],
              browserApiTools: browserApiToolsMetadata,
            });

        await subscribeToChatEvents({
          events$,
          conversationActions: streamActions,
          browserApiTools: vars.browserApiTools,
          browserToolExecutor,
          isAborted: () => controller.signal.aborted,
          setAgentReasoning: (reasoning) => updateActiveReasoning(vars.conversationId, reasoning),
        });

        if (!isRegenerate) {
          clearPendingMessage(vars.conversationId);
          vars.resetAttachments?.();
        }
        succeeded = true;
      } catch (err) {
        setError(vars.conversationId, err, vars.lastRoundSteps ?? []);
        if (!isRegenerate) {
          // Remove the optimistic round immediately so the error round and the optimistic
          // round are not both visible.
          streamActions.removeOptimisticRound();
        }
        throw err;
      } finally {
        // Only invalidate on success. On error: refetching a fresh conversation that
        // never persisted server-side would 404 and replace the in-round error UI with
        // the "Conversation not found" page. The cache already holds the right state
        // for `useConversationRounds` to render the synthetic error round.
        // Also skip when paused on a HITL prompt (cache is canonical there too).
        const cached = queryClient.getQueryData<Conversation>(
          queryKeys.conversations.byId(vars.conversationId)
        );
        const endedInAwaitingPrompt =
          cached?.rounds?.at(-1)?.status === ConversationRoundStatus.awaitingPrompt;
        if (succeeded && !endedInAwaitingPrompt) {
          streamActions.invalidateConversation();
        }
        clearActiveStream(vars.conversationId);
        if (controllersRef.current.get(vars.conversationId) === controller) {
          controllersRef.current.delete(vars.conversationId);
        }
      }
    },
  });

  const cancel = useCallback((conversationId: string) => {
    controllersRef.current.get(conversationId)?.abort();
  }, []);

  const cancelAll = useCallback(() => {
    for (const controller of controllersRef.current.values()) {
      controller.abort();
    }
  }, []);

  return {
    mutate,
    isLoading,
    cancel,
    cancelAll,
  };
};

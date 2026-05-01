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
  updateActiveReasoning: (reasoning: string) => void;
  setPendingMessage: (conversationId: string, message: string) => void;
  clearPendingMessage: (conversationId: string) => void;
  setError: (conversationId: string, error: unknown, errorSteps: ConversationRoundStep[]) => void;
  clearActiveStream: () => void;
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
  clearActiveStream,
}: UseSendMessageMutationProps) => {
  const { chatService, conversationsService } = useAgentBuilderServices();
  const { services } = useKibana();
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  const browserToolExecutor = useMemo(() => {
    return new BrowserToolExecutor(services.notifications?.toasts);
  }, [services.notifications?.toasts]);

  const { mutate, isLoading } = useMutation({
    mutationKey: mutationKeys.sendMessage,
    mutationFn: async (vars: SendMessageVars) => {
      const isRegenerate = vars.action === 'regenerate';

      // Each conversation owns its streaming lifecycle. The streamActions instance built
      // here is closure-bound to vars.conversationId for the duration of this mutation —
      // stream events target that conversation regardless of navigation.
      const streamActions = createConversationActions({
        conversationId: vars.conversationId,
        queryClient,
        conversationsService,
      });

      const controller = new AbortController();
      abortControllerRef.current = controller;

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
          setAgentReasoning: updateActiveReasoning,
        });

        if (!isRegenerate) {
          clearPendingMessage(vars.conversationId);
          vars.resetAttachments?.();
        }
      } catch (err) {
        setError(vars.conversationId, err, vars.lastRoundSteps ?? []);
        if (!isRegenerate) {
          // Remove the optimistic round immediately so the error round and the optimistic
          // round are not both visible.
          streamActions.removeOptimisticRound();
        }
        throw err;
      } finally {
        // Skip invalidation when the round paused on a HITL prompt. The cache is the
        // canonical source of truth in that state (server has the same pending prompt),
        // and a stale-marked cache would race with the resume mutation's optimistic
        // updates if anything reopened the `useConversation` gate.
        const cached = queryClient.getQueryData<Conversation>(
          queryKeys.conversations.byId(vars.conversationId)
        );
        const endedInAwaitingPrompt =
          cached?.rounds?.at(-1)?.status === ConversationRoundStatus.awaitingPrompt;
        if (!endedInAwaitingPrompt) {
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

  const cleanConversation = useCallback(
    ({ conversationId, hasError }: { conversationId?: string; hasError: boolean }) => {
      // Cleaning the conversation is only invoked when the user wants to back out of a
      // pending or errored state. If a stream is in flight, abort it; otherwise just clear
      // any leftover error/pending state.
      if (isLoading) {
        abortControllerRef.current?.abort();
        return;
      }
      if (hasError && conversationId) {
        clearPendingMessage(conversationId);
      }
    },
    [isLoading, clearPendingMessage]
  );

  return {
    mutate,
    isLoading,
    cancel,
    cleanConversation,
  };
};

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
import { firstValueFrom, tap } from 'rxjs';
import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { isExecutionStartedEvent, isExecutionTerminalEvent } from '@kbn/agent-builder-common';
import type {
  Attachment,
  ConversationAttachment,
  ScreenContextAttachmentData,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { AttachmentType, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { flattenAttachments } from '../conversation/flatten_attachments';
import {
  buildOptimisticAttachments,
  type OptimisticAttachments,
} from '../../utils/build_optimistic_attachments';
import { useKibana } from '../../hooks/use_kibana';
import type { StartServices } from '../../hooks/use_kibana';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { mutationKeys } from '../../mutation_keys';
import { subscribeToChatEvents } from './use_subscribe_to_chat_events';
import { BrowserToolExecutor } from '../../services/browser_tool_executor';
import { createConversationActions } from '../conversation/use_conversation_actions';
import type { ConversationStreamService } from '../../../services/events';
import { releaseLocalContent } from './release_local_content';
import { isStreamCancelled, requestAbort, type StreamHandle } from './stream_handle';

const SCREEN_CONTEXT_ATTACHMENT_ID = 'screen-context';

export interface SendMessageVars {
  message: string;
  conversationId: string;
  agentId: string;
  connectorId?: string;
  attachments?: ConversationAttachment[];
  conversationAttachments?: VersionedAttachment[];
  resetAttachments?: () => void;
  browserApiTools?: Array<BrowserApiToolDefinition<any>>;
}

export interface SendMessageMutationBindings {
  conversationStreamService: ConversationStreamService;
  setPendingMessage: (
    conversationId: string,
    message: string,
    attachments?: OptimisticAttachments
  ) => void;
  clearPendingMessage: (conversationId: string) => void;
  clearActiveStream: (conversationId: string) => void;
  markStreamStarted: (conversationId: string) => void;
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
 * Send-message mutation. Lives in the lifted StreamingProvider so streaming
 * state is visible to the whole app (sidebar included).
 *
 * Single-scope `mutationFn` (setup → try → catch → finally) — no `onMutate` / `onSettled`
 * lifecycle methods, no refs to bridge phases. Each invocation builds its own
 * `streamActions` instance targeting `vars.conversationId`, so refetches target the right
 * conversation regardless of where the user has navigated.
 */
export const useSendMessageMutation = ({
  conversationStreamService,
  setPendingMessage,
  clearPendingMessage,
  clearActiveStream,
  markStreamStarted,
}: UseSendMessageMutationProps) => {
  const { chatService, conversationsService } = useAgentBuilderServices();
  const { services } = useKibana();
  const queryClient = useQueryClient();
  // One controller + executionId per in-flight conversation. Concurrent streams need
  // independent cancel; the executionId is what the abort endpoint uses to stop server-side.
  // `useSendMessageMutation` is called exactly once — by  the `StreamingProvider`.
  const controllersRef = useRef<Map<string, StreamHandle>>(new Map());

  const browserToolExecutor = useMemo(() => {
    return new BrowserToolExecutor(services.notifications?.toasts);
  }, [services.notifications?.toasts]);

  const { mutate, isLoading } = useMutation({
    mutationKey: mutationKeys.sendMessage,
    mutationFn: async (vars: SendMessageVars) => {
      const streamActions = createConversationActions({
        conversationId: vars.conversationId,
        queryClient,
        conversationsService,
      });

      const previous = controllersRef.current.get(vars.conversationId);
      if (previous) {
        chatService.abort(previous.executionId).catch(() => {});
        previous.controller.abort();
      }
      const controller = new AbortController();
      const executionId = uuidv4();
      const handle: StreamHandle = { controller, executionId, abortRequested: false };
      controllersRef.current.set(vars.conversationId, handle);

      if (!vars.message) {
        throw new Error('Message is required');
      }
      setPendingMessage(
        vars.conversationId,
        vars.message,
        buildOptimisticAttachments({
          attachments: flattenAttachments(vars.attachments ?? []),
          conversationAttachments: vars.conversationAttachments,
        })
      );

      let timelineExecutionId: string | undefined;
      let triggerEventId: string | undefined;

      try {
        const browserApiToolsMetadata = vars.browserApiTools?.map(toToolMetadata);
        const projectRouting = services.plugins.cps?.cpsManager?.getProjectRouting();

        const rawEvents$ = chatService.chat({
          signal: controller.signal,
          executionId,
          input: vars.message,
          conversationId: vars.conversationId,
          agentId: vars.agentId,
          connectorId: vars.connectorId,
          attachments: [
            ...flattenAttachments(vars.attachments ?? []),
            ...(await withScreenContextAttachment({
              services,
              conversationAttachments: vars.conversationAttachments,
            })),
          ],
          browserApiTools: browserApiToolsMetadata,
          projectRouting,
        });

        const events$ = rawEvents$.pipe(
          tap((event) => {
            if (isExecutionStartedEvent(event)) {
              markStreamStarted(vars.conversationId);
            }
            if (isExecutionStartedEvent(event) || isExecutionTerminalEvent(event)) {
              timelineExecutionId ??= event.execution_id;
              triggerEventId ??= event.trigger_event_id;
            }
          })
        );

        // Failures are persisted by the server and arrive through the refetch below, so a stream
        // that errors ends the same way as one that completed or was stopped.
        await subscribeToChatEvents({
          events$,
          conversationActions: streamActions,
          browserApiTools: vars.browserApiTools,
          browserToolExecutor,
          isAborted: () => isStreamCancelled(handle),
        }).catch(() => {});

        if (!isStreamCancelled(handle)) {
          vars.resetAttachments?.();
        }
        clearActiveStream(vars.conversationId);
        await releaseLocalContent({
          refetch: streamActions.refetchConversation,
          triggerEventId,
          executionId: timelineExecutionId,
          clearPendingMessage: () => clearPendingMessage(vars.conversationId),
          clearExecution: (persistedExecutionId) =>
            conversationStreamService.clearPersistedExecution(
              vars.conversationId,
              persistedExecutionId
            ),
        });
      } finally {
        clearActiveStream(vars.conversationId);
        if (controllersRef.current.get(vars.conversationId)?.controller === controller) {
          controllersRef.current.delete(vars.conversationId);
        }
      }
    },
  });

  const cancel = useCallback(
    (conversationId: string) => {
      const handle = controllersRef.current.get(conversationId);
      if (handle) {
        requestAbort(handle, chatService);
      }
    },
    [chatService]
  );

  const cancelAll = useCallback(() => {
    for (const { controller, executionId } of controllersRef.current.values()) {
      chatService.abort(executionId).catch(() => {});
      controller.abort();
    }
  }, [chatService]);

  return {
    mutate,
    isLoading,
    cancel,
    cancelAll,
  };
};

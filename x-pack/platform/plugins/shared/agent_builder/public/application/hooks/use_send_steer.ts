/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { EventActorType, TimelineEventType } from '@kbn/agent-builder-common';
import type { UserMessageEvent } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import type { SteerConversationErrorBody } from '../../../common/http_api/conversations';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useConversationStreamService } from '../context/streaming/streaming_context';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useConversationStream } from './use_conversation_stream';
import { useCurrentUser } from './use_current_user';
import { useToasts } from './use_toasts';

const labels = {
  awaitingPrompt: i18n.translate('xpack.agentBuilder.conversationInput.steer.awaitingPrompt', {
    defaultMessage: 'The agent is waiting for your answer to its question. Answer it first.',
  }),
  notSteerable: i18n.translate('xpack.agentBuilder.conversationInput.steer.notSteerable', {
    defaultMessage: 'Messages cannot be sent to a running agent in a public conversation.',
  }),
  tooManyPending: i18n.translate('xpack.agentBuilder.conversationInput.steer.tooManyPending', {
    defaultMessage: 'The agent already has several unread messages. Wait for it to catch up.',
  }),
  failed: i18n.translate('xpack.agentBuilder.conversationInput.steer.failed', {
    defaultMessage: 'The message could not be sent to the running agent.',
  }),
};

/** The typed refusal the `_steer` route puts in the error body's `attributes`. */
const steerErrorBody = (error: unknown): SteerConversationErrorBody | undefined => {
  const body = (error as IHttpFetchError<{ attributes?: SteerConversationErrorBody }>)?.body;
  const attributes = body && typeof body === 'object' ? body.attributes : undefined;
  return attributes && typeof attributes === 'object' && 'error' in attributes
    ? attributes
    : undefined;
};

/**
 * Sends a message to the agent running on the current conversation. Stored first by the `_steer`
 * route, then shown in the timeline as waiting until the run's `message_delivered` event moves it
 * between the steps. When the run has released the lock meanwhile, the message starts a run
 * through the ordinary send path instead, so one submit always stores one message.
 */
export const useSendSteer = () => {
  const conversationId = useConversationId();
  const { conversationsService } = useAgentBuilderServices();
  const conversationStreamService = useConversationStreamService();
  const { sendMessage } = useConversationStream();
  const { currentUser } = useCurrentUser();
  const { addErrorToast } = useToasts();
  const [isSending, setIsSending] = useState(false);

  const sendSteer = useCallback(
    async (message: string): Promise<boolean> => {
      if (!conversationId) {
        return false;
      }
      const eventId = uuidv4();
      setIsSending(true);
      try {
        const result = await conversationsService.steer({ conversationId, message, eventId });
        const stored: UserMessageEvent = {
          id: result.event_id,
          type: TimelineEventType.userMessage,
          created_at: result.created_at,
          actor: {
            type: EventActorType.user,
            id: currentUser?.uid ?? '',
            ...(currentUser?.user.username ? { username: currentUser.user.username } : {}),
          },
          data: { message, steer: { execution_id: result.execution_id } },
        };
        conversationStreamService.recordSteer(conversationId, stored);
        return true;
      } catch (error) {
        const body = steerErrorBody(error);
        if (body?.error === 'no_active_execution' && !body.already_stored) {
          // The run finished between the two requests: the message starts the next one.
          sendMessage({ message, conversationId });
          return true;
        }
        if (body?.error === 'no_active_execution') {
          return true;
        }
        const title =
          body?.error === 'awaiting_prompt'
            ? labels.awaitingPrompt
            : body?.error === 'not_steerable'
            ? labels.notSteerable
            : body?.error === 'too_many_pending'
            ? labels.tooManyPending
            : labels.failed;
        addErrorToast({ title });
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [
      conversationId,
      conversationsService,
      conversationStreamService,
      sendMessage,
      currentUser,
      addErrorToast,
    ]
  );

  return { sendSteer, isSending };
};

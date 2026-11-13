/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import {
  AgentBuilderErrorCode,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import type { UserMessageEvent } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import type {
  SteerConversationErrorBody,
  SteerConversationResponse,
} from '../../../common/http_api/conversations';
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

/** A 4xx without a steer code (not found, forbidden, invalid): refused before anything was written. */
const isAnsweredRefusal = (error: unknown): boolean => {
  const status = (error as IHttpFetchError)?.response?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
};

/** Whether the ordinary send was refused because a run holds the conversation. */
const isConversationBusyRejection = (error: unknown): boolean => {
  const body = (error as IHttpFetchError<{ attributes?: { code?: string } }>)?.body;
  return body?.attributes?.code === AgentBuilderErrorCode.conversationBusy;
};

/** A steer request that got no answer; its id is reused so the retry stores nothing twice. */
interface UnansweredSteer {
  conversationId: string;
  message: string;
  eventId: string;
}

type SteerOutcome =
  /** Stored by this request or an earlier one. */
  | { kind: 'stored' }
  /** No run holds the conversation and nothing is stored: the message starts a run instead. */
  | { kind: 'converse' }
  /** Refused by the server, with the reason to show. */
  | { kind: 'refused'; title: string }
  /** No answer: the request may or may not have landed. */
  | { kind: 'unanswered' };

export interface SendSteerOptions {
  /** Called with the message when a failure settles after the submit already resolved as sent. */
  onUnsent?: (message: string) => void;
}

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
  const unansweredRef = useRef<UnansweredSteer | undefined>(undefined);

  const attemptSteer = useCallback(
    async ({
      targetConversationId,
      message,
      eventId,
    }: {
      targetConversationId: string;
      message: string;
      eventId: string;
    }): Promise<SteerOutcome> => {
      let result: SteerConversationResponse;
      try {
        result = await conversationsService.steer({
          conversationId: targetConversationId,
          message,
          eventId,
        });
      } catch (error) {
        const body = steerErrorBody(error);
        if (body?.error === 'no_active_execution') {
          return body.already_stored ? { kind: 'stored' } : { kind: 'converse' };
        }
        if (body?.error === 'awaiting_prompt') {
          return { kind: 'refused', title: labels.awaitingPrompt };
        }
        if (body?.error === 'not_steerable') {
          return { kind: 'refused', title: labels.notSteerable };
        }
        if (body?.error === 'too_many_pending') {
          return { kind: 'refused', title: labels.tooManyPending };
        }
        if (isAnsweredRefusal(error)) {
          return { kind: 'refused', title: formatAgentBuilderErrorMessage(error) };
        }
        return { kind: 'unanswered' };
      }
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
      conversationStreamService.recordSteer(targetConversationId, stored);
      return { kind: 'stored' };
    },
    [conversationsService, conversationStreamService, currentUser]
  );

  /**
   * Whether the message is the text of a steer request that got no answer. A resend of it is a
   * retry under the same id, through `sendSteer`, also once the run has ended: the server then
   * reports the message stored, or lets it start the next run, but never stores it twice.
   */
  const isUnansweredSteer = useCallback(
    (message: string): boolean => {
      const unanswered = unansweredRef.current;
      return (
        unanswered !== undefined &&
        unanswered.conversationId === conversationId &&
        unanswered.message === message
      );
    },
    [conversationId]
  );

  /**
   * The `onRejected` handler of an ordinary send: when a run took the conversation before the send
   * acquired it, the message steers that run once, under the given id, so the attempts still amount
   * to one stored message. Any other rejection is left to the send path.
   */
  const steerAfterBusy = useCallback(
    ({
        message,
        eventId,
        onUnsent,
      }: {
        message: string;
        eventId: string;
        onUnsent?: (message: string) => void;
      }) =>
      (error: unknown): boolean => {
        if (!conversationId || !isConversationBusyRejection(error)) {
          return false;
        }
        void attemptSteer({ targetConversationId: conversationId, message, eventId }).then(
          (retry) => {
            if (retry.kind === 'stored') {
              return;
            }
            if (retry.kind === 'unanswered') {
              unansweredRef.current = { conversationId, message, eventId };
            }
            // The new run gone again is not raced a third time: the text goes back to the user.
            addErrorToast({ title: retry.kind === 'refused' ? retry.title : labels.failed });
            onUnsent?.(message);
          }
        );
        return true;
      },
    [conversationId, attemptSteer, addErrorToast]
  );

  const sendSteer = useCallback(
    async (message: string, { onUnsent }: SendSteerOptions = {}): Promise<boolean> => {
      if (!conversationId) {
        return false;
      }
      // The same text after an unanswered request is a retry of it, under the same id.
      const unanswered = unansweredRef.current;
      const eventId = unanswered && isUnansweredSteer(message) ? unanswered.eventId : uuidv4();
      unansweredRef.current = undefined;
      setIsSending(true);
      try {
        const outcome = await attemptSteer({
          targetConversationId: conversationId,
          message,
          eventId,
        });
        switch (outcome.kind) {
          case 'stored':
            return true;
          case 'unanswered':
            unansweredRef.current = { conversationId, message, eventId };
            addErrorToast({ title: labels.failed });
            return false;
          case 'refused':
            addErrorToast({ title: outcome.title });
            return false;
          case 'converse':
            // The run finished between the two requests: the message starts the next one.
            sendMessage({
              message,
              conversationId,
              onRejected: steerAfterBusy({ message, eventId, onUnsent }),
            });
            return true;
        }
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, isUnansweredSteer, attemptSteer, sendMessage, addErrorToast, steerAfterBusy]
  );

  /** For an ordinary send of `message`: steers the run that refused it as busy, under a new id. */
  const steerIfBusy = useCallback(
    (message: string, { onUnsent }: SendSteerOptions = {}) =>
      steerAfterBusy({ message, eventId: uuidv4(), onUnsent }),
    [steerAfterBusy]
  );

  return { sendSteer, steerIfBusy, isUnansweredSteer, isSending };
};

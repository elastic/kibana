/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useConversationStreamService } from '../context/streaming/streaming_context';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useConversationStream } from './use_conversation_stream';
import { useToasts } from './use_toasts';
import { isConversationBusyRejection, requestSteer } from './steer_outcome';
import type { SteerOutcome } from './steer_outcome';

const labels = {
  failed: i18n.translate('xpack.agentBuilder.conversationInput.steer.failed', {
    defaultMessage: 'The message could not be sent to the running agent.',
  }),
};

/** A steer request that got no answer; its id is reused so the retry stores nothing twice. */
interface UnansweredSteer {
  conversationId: string;
  message: string;
  eventId: string;
}

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
  const { addErrorToast } = useToasts();
  const [isSending, setIsSending] = useState(false);
  const unansweredRef = useRef<UnansweredSteer | undefined>(undefined);

  // The stored event goes into the live stream as the server holds it, so the message shows as
  // waiting before the run picks it up and matches the saved form once it is reloaded.
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
      const outcome = await requestSteer(conversationsService, {
        conversationId: targetConversationId,
        message,
        eventId,
      });
      if (outcome.kind === 'stored') {
        conversationStreamService.recordSteer(targetConversationId, outcome.event);
      }
      return outcome;
    },
    [conversationsService, conversationStreamService]
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

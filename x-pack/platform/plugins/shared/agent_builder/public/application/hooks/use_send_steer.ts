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

interface UnansweredSteer {
  conversationId: string;
  message: string;
  eventId: string;
}

export interface SendSteerOptions {
  /** Called with the message when a failure settles after the submit already resolved as sent. */
  onUnsent?: (message: string) => void;
}

/** Steers the active run, falling back to converse when idle. */
export const useSendSteer = () => {
  const conversationId = useConversationId();
  const { conversationsService } = useAgentBuilderServices();
  const conversationStreamService = useConversationStreamService();
  const { sendMessage } = useConversationStream();
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

  /** Identifies retries of uncertain writes, including after the execution ends. */
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

  /** On a busy converse, attempt one steer with the same event id. */
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

  const steerIfBusy = useCallback(
    (message: string, { onUnsent }: SendSteerOptions = {}) =>
      steerAfterBusy({ message, eventId: uuidv4(), onUnsent }),
    [steerAfterBusy]
  );

  return { sendSteer, steerIfBusy, isUnansweredSteer, isSending };
};

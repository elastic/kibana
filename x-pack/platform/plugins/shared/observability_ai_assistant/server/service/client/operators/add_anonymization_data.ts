/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dictionary, cloneDeep, keyBy } from 'lodash';
import { OperatorFunction, defaultIfEmpty, filter, map, toArray } from 'rxjs';
import {
  StreamingChatResponseEventType,
  type MessageAddEvent,
  type StreamingChatResponseEvent,
} from '../../../../common/conversation_complete';
import type { Message } from '../../../../common/types';

/**
 * Operator to process events with deanonymization data and format messages with deanonymizations.
 * Deanonymizations are matched based on `content`, as the Inference client's anonymization process
 * only emits deanonymizations based on `content`. Message ordering is not reliable because not
 * every MessageAddEvent is guaranteed to have the same messages as input as the source messages.
 *
 * @param allMessages The combined messages to use as a fallback if no deanonymization data is found
 * @returns An Observable that emits a single array of messages with deanonymization data added
 */
export function addAnonymizationData(
  messages: Message[]
): OperatorFunction<StreamingChatResponseEvent, Message[]> {
  return (source$) => {
    // Find the latest event with deanonymization data
    return source$.pipe(
      filter(
        (event): event is MessageAddEvent =>
          event.type === StreamingChatResponseEventType.MessageAdd &&
          !!(event.deanonymized_input || event.deanonymized_output)
      ),
      toArray(),
      map((events) => {
        const clonedMessages = cloneDeep(messages);

        const messagesByContent: Dictionary<Message> = keyBy(
          clonedMessages.filter(
            (item): item is typeof item & { message: { content: string } } => !!item.message.content
          ),
          (item) => item.message.content
        );

        for (const event of events) {
          event.deanonymized_input?.forEach((item) => {
            const matchingMessage = item.message.content
              ? messagesByContent[item.message.content]
              : undefined;

            if (matchingMessage) {
              matchingMessage.message.deanonymizations = item.deanonymizations;
            }
          });

          if (event.deanonymized_output?.message.content) {
            const matchingMessage = event.deanonymized_output.message.content
              ? messagesByContent[event.deanonymized_output.message.content]
              : undefined;

            if (matchingMessage) {
              matchingMessage.message.deanonymizations = event.deanonymized_output.deanonymizations;
            }
          }
        }

        return clonedMessages;
      }),
      defaultIfEmpty(messages)
    );
  };
}

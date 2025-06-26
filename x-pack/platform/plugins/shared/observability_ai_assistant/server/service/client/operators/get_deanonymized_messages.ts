/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map, takeLast, defaultIfEmpty, OperatorFunction } from 'rxjs';
import type { Message } from '../../../../common/types';
import {
  StreamingChatResponseEventType,
  type MessageAddEvent,
  type StreamingChatResponseEvent,
} from '../../../../common/conversation_complete';

/**
 * operator to process events with deanonymization data and format messages with unredactions.
 *
 * @param allMessages The combined messages to use as a fallback if no deanonymization data is found
 * @returns An Observable that emits a single array of messages with deanonymization data added
 */
export function getDeanonymizedMessages(
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
      takeLast(1),
      map((event: MessageAddEvent) => {
        // Create a copy of messages that we'll modify with deanonymization data
        const result = [...messages];

        // Extract the initial messages (before the current event's messages)
        const initialMessagesCount = result.length - (event.deanonymized_input?.length || 0) - 1; // -1 for the current message

        // Process messages from deanonymized_input - assign unredactions by order
        if (event.deanonymized_input?.length) {
          event.deanonymized_input.forEach((item, index) => {
            // Calculate the corresponding index in our result array
            const resultIndex = initialMessagesCount + index;

            // If there's a valid message at this index, add the unredactions to it
            if (resultIndex >= 0 && resultIndex < result.length) {
              // Add unredactions directly to the message
              result[resultIndex].message.unredactions = item.deanonymizations;
            }
          });
        }

        // Add unredactions from deanonymized_output to the last message (current response)
        if (event.deanonymized_output && result.length > 0) {
          const lastIndex = result.length - 1;
          result[lastIndex].message.unredactions = event.deanonymized_output.deanonymizations;
        }

        return result;
      }),
      defaultIfEmpty(messages)
    );
  };
}

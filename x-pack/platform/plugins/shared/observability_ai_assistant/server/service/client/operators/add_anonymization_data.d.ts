import type { OperatorFunction } from 'rxjs';
import { type StreamingChatResponseEvent } from '../../../../common/conversation_complete';
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
export declare function addAnonymizationData(messages: Message[]): OperatorFunction<StreamingChatResponseEvent, Message[]>;

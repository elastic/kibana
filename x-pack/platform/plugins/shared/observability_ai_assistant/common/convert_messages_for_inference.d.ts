import type { Message as InferenceMessage } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { Message } from '.';
export declare function collapseInternalToolCalls(messages: Message[], logger: Pick<Logger, 'error'>): Message[];
export declare function convertMessagesForInference(messages: Message[], logger: Pick<Logger, 'error'>): InferenceMessage[];

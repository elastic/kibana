import type { Message as InferenceMessage } from '@kbn/inference-common';
import { type BaseMessage } from '@langchain/core/messages';
export declare const messagesToInference: (messages: BaseMessage[]) => {
    messages: InferenceMessage[];
    system: string | undefined;
};

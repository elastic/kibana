import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { FunctionCallingMode, Message, ToolOptions, ChatCompleteMetadata, ChatCompletionChunkEvent, ChatCompletionTokenCountEvent } from '@kbn/inference-common';
import type { InferenceEndpointExecutor } from '../../utils/inference_endpoint_executor';
export interface InferenceEndpointAdapterChatCompleteOptions {
    executor: InferenceEndpointExecutor;
    messages: Message[];
    logger: Logger;
    system?: string;
    functionCalling?: FunctionCallingMode;
    temperature?: number;
    modelName?: string;
    abortSignal?: AbortSignal;
    metadata?: ChatCompleteMetadata;
    stream?: boolean;
    timeout?: number;
    tools?: ToolOptions['tools'];
    toolChoice?: ToolOptions['toolChoice'];
}
export declare const inferenceEndpointAdapter: {
    chatComplete: (options: InferenceEndpointAdapterChatCompleteOptions) => Observable<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>;
};

import type { FunctionCallingMode, Message, ToolOptions, InferenceConnector, Prompt, ChatCompleteMetadata, ToolChoice } from '@kbn/inference-common';
export interface ChatCompleteRequestBodyBase {
    connectorId: string;
    temperature?: number;
    modelName?: string;
    functionCalling?: FunctionCallingMode;
    maxRetries?: number;
    retryConfiguration?: {
        retryOn?: 'all' | 'auto';
    };
    metadata?: ChatCompleteMetadata;
    toolChoice?: ToolChoice;
}
export type ChatCompleteRequestBody = ChatCompleteRequestBodyBase & {
    system?: string;
    messages: Message[];
} & ToolOptions;
export type PromptRequestBody = ChatCompleteRequestBodyBase & {
    prompt: Omit<Prompt, 'input'>;
    prevMessages?: Message[];
    input?: unknown;
};
export interface GetConnectorsResponseBody {
    connectors: InferenceConnector[];
}

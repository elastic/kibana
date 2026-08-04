import type { Logger } from '@kbn/logging';
import type { ChatCompletionChunkEvent, ChatCompletionMessageEvent, Message, ToolOptions, OutputCompleteEvent, ChatCompleteMetadata, ChatCompleteOptions, InferenceClient } from '@kbn/inference-common';
export type NlToEsqlTaskEvent<TToolOptions extends ToolOptions> = OutputCompleteEvent<'request_documentation', {
    keywords: string[];
    requestedDocumentation: Record<string, string>;
}> | ChatCompletionChunkEvent | ChatCompletionMessageEvent<TToolOptions>;
export type NlToEsqlTaskParams<TToolOptions extends ToolOptions> = {
    client: Pick<InferenceClient, 'output' | 'chatComplete'>;
    connectorId: string;
    logger: Pick<Logger, 'debug'>;
    system?: string;
    metadata?: ChatCompleteMetadata;
} & TToolOptions & Pick<ChatCompleteOptions, 'maxRetries' | 'retryConfiguration' | 'functionCalling'> & ({
    input: string;
} | {
    messages: Message[];
});

import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { ToolOptions, Message, ChatCompleteMetadata, ChatCompleteOptions, ChatCompleteAPI } from '@kbn/inference-common';
import type { EsqlDocumentBase } from '../doc_base';
import type { NlToEsqlTaskEvent } from '../types';
interface LlmEsqlTaskOptions {
    documentationRequest: {
        commands?: string[];
        functions?: string[];
    };
    callCount?: number;
}
type LlmEsqlTask<TToolOptions extends ToolOptions = ToolOptions> = (options: LlmEsqlTaskOptions) => Observable<NlToEsqlTaskEvent<TToolOptions>>;
interface GenerateEsqlTaskOptions extends Pick<ChatCompleteOptions, 'maxRetries' | 'retryConfiguration' | 'functionCalling'> {
    connectorId: string;
    messages: Message[];
    chatCompleteApi: ChatCompleteAPI;
    docBase: EsqlDocumentBase;
    logger: Pick<Logger, 'debug'>;
    metadata?: ChatCompleteMetadata;
    maxCallsAllowed?: number;
    additionalSystemInstructions?: string;
}
export declare function generateEsqlTask<TToolOptions extends ToolOptions>(options: GenerateEsqlTaskOptions & {
    toolOptions: TToolOptions;
}): LlmEsqlTask<TToolOptions>;
export {};

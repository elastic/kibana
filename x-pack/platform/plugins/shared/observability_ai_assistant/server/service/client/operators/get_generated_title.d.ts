import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { ChatCompleteResponse } from '@kbn/inference-common';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import type { ObservabilityAIAssistantClient } from '..';
import type { Message } from '../../../../common';
export declare const TITLE_CONVERSATION_FUNCTION_NAME = "title_conversation";
export declare const getTitleSystemMessage: (scopes: AssistantScope[]) => string;
type ChatFunctionWithoutConnectorAndTokenCount = (name: string, params: Omit<Parameters<ObservabilityAIAssistantClient['chat']>[1], 'connectorId' | 'signal' | 'simulateFunctionCalling'>) => Promise<ChatCompleteResponse>;
export declare function getGeneratedTitle({ messages, chat, logger, scopes, }: {
    messages: Message[];
    chat: ChatFunctionWithoutConnectorAndTokenCount;
    logger: Pick<Logger, 'debug' | 'error'>;
    scopes: AssistantScope[];
}): Observable<string>;
export {};

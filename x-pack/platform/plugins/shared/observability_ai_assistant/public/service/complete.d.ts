import { Observable } from 'rxjs';
import { type StreamingChatResponseEventWithoutError } from '../../common';
import type { ObservabilityAIAssistantScreenContext } from '../../common/types';
import type { ObservabilityAIAssistantAPIClientRequestParamsOf } from '../api';
import type { ObservabilityAIAssistantChatService } from '../types';
export declare function complete({ client, getScreenContexts, connectorId, conversationId, messages: initialMessages, persist, disableFunctions, signal, instructions, scopes, }: {
    client: Pick<ObservabilityAIAssistantChatService, 'chat' | 'complete'>;
    getScreenContexts: () => ObservabilityAIAssistantScreenContext[];
} & Parameters<ObservabilityAIAssistantChatService['complete']>[0], requestCallback: (params: ObservabilityAIAssistantAPIClientRequestParamsOf<'POST /internal/observability_ai_assistant/chat/complete'>) => Observable<StreamingChatResponseEventWithoutError>): Observable<StreamingChatResponseEventWithoutError>;

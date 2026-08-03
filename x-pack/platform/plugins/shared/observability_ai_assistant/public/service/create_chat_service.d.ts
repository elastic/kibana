import type { AnalyticsServiceStart } from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import type { ObservabilityAIAssistantAPIClient } from '../api';
import type { ChatRegistrationRenderFunction, ObservabilityAIAssistantChatService } from '../types';
export declare function createChatService({ analytics, signal: setupAbortSignal, registrations, apiClient, scope$, }: {
    analytics: AnalyticsServiceStart;
    signal: AbortSignal;
    registrations: ChatRegistrationRenderFunction[];
    apiClient: ObservabilityAIAssistantAPIClient;
    scope$: BehaviorSubject<AssistantScope[]>;
}): Promise<ObservabilityAIAssistantChatService>;

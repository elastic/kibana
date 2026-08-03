import type { AnalyticsServiceStart, CoreStart } from '@kbn/core/public';
import { type AssistantScope } from '@kbn/ai-assistant-common';
import type { ObservabilityAIAssistantService } from '../types';
export declare function createService({ analytics, coreStart, enabled, scopes, scopeIsMutable, }: {
    analytics: AnalyticsServiceStart;
    coreStart: CoreStart;
    enabled: boolean;
    scopes: [AssistantScope];
    scopeIsMutable: boolean;
}): ObservabilityAIAssistantService;

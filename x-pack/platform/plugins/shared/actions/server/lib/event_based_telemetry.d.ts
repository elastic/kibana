import type { EventTypeOpts } from '@kbn/core/server';
export declare const GEN_AI_TOKEN_COUNT_EVENT: EventTypeOpts<{
    actionTypeId: string;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    provider?: string;
    model?: string;
    pluginId?: string;
    aggregateBy?: string;
}>;
export declare const events: Array<EventTypeOpts<{
    [key: string]: unknown;
}>>;

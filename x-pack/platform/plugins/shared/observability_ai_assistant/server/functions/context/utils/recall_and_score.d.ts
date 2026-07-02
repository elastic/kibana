import type { Logger } from '@kbn/logging';
import type { AnalyticsServiceStart } from '@kbn/core/server';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import type { Connector } from '@kbn/actions-plugin/server';
import type { Message } from '../../../../common';
import type { ObservabilityAIAssistantClient } from '../../../service/client';
import type { FunctionCallChatFunction } from '../../../service/types';
import type { RecalledEntry } from '../../../service/knowledge_base_service';
export type RecalledSuggestion = Pick<RecalledEntry, 'id' | 'text' | 'esScore'>;
export declare function recallAndScore({ recall, chat, analytics, scopes, connector, screenDescription, messages, logger, signal, }: {
    recall: ObservabilityAIAssistantClient['recall'];
    chat: FunctionCallChatFunction;
    analytics: AnalyticsServiceStart;
    scopes: AssistantScope[];
    connector?: Connector;
    screenDescription: string;
    messages: Message[];
    logger: Logger;
    signal: AbortSignal;
}): Promise<{
    relevantDocuments?: RecalledSuggestion[];
    llmScores?: Array<{
        id: string;
        llmScore: number;
    }>;
    suggestions: RecalledSuggestion[];
}>;

import type { Logger } from '@kbn/logging';
import type { Message } from '../../../../common';
import type { FunctionCallChatFunction } from '../../../service/types';
import type { RecalledSuggestion } from './recall_and_score';
export declare const SCORE_SUGGESTIONS_FUNCTION_NAME = "score_suggestions";
export declare function scoreSuggestions({ suggestions, messages, screenDescription, chat, signal, logger, }: {
    suggestions: RecalledSuggestion[];
    messages: Message[];
    screenDescription: string;
    chat: FunctionCallChatFunction;
    signal: AbortSignal;
    logger: Logger;
}): Promise<{
    relevantDocuments: RecalledSuggestion[];
    llmScores: Array<{
        id: string;
        llmScore: number;
    }>;
}>;

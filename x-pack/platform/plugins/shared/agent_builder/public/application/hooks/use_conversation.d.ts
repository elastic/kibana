import { type Conversation } from '@kbn/agent-builder-common';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ErrorPromptType } from '../components/common/prompt/error_prompt';
export declare const useConversation: () => {
    conversation: Conversation | undefined;
    isLoading: boolean;
    isFetching: boolean;
    isFetched: boolean;
    isError: boolean;
    error: IHttpFetchError<unknown> | null;
};
export declare const useConversationStatus: () => {
    isLoading: boolean;
    isFetching: boolean;
    isFetched: boolean;
};
export declare const useConversationError: () => {
    isError: boolean;
    error: IHttpFetchError<unknown> | undefined;
    errorStatus: number | undefined;
    errorType: ErrorPromptType | undefined;
};
export declare const useAgentId: () => string | undefined;
export declare const useConversationTitle: () => {
    title: string;
    isLoading: boolean;
};
export declare const useConversationRounds: () => import("@kbn/agent-builder-common").ConversationRound[];
export declare const useStepsFromPrevRounds: () => import("@kbn/agent-builder-common").ConversationRoundStep[];
export declare const useHasActiveConversation: () => boolean;
export declare const useHasPersistedConversation: () => boolean;
export declare const useIsAwaitingPrompt: () => boolean;

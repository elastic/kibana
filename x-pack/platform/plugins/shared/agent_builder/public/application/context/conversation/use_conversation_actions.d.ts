import type { QueryClient } from '@kbn/react-query';
import type { ReasoningStep, ToolCallProgress, ToolCallStep, BackgroundAgentCompleteStep } from '@kbn/agent-builder-common';
import type { TodoItem } from '@kbn/agent-builder-common/chat/conversation';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { ConversationsService } from '../../../services/conversations';
export interface ConversationActions {
    invalidateConversation: () => void;
    addOptimisticRound: ({ userMessage, attachments, agentId, }: {
        userMessage: string;
        attachments?: AttachmentInput[];
        agentId: string;
    }) => Promise<void>;
    removeOptimisticRound: () => void;
    clearLastRoundResponse: () => void;
    addReasoningStep: ({ step }: {
        step: ReasoningStep;
    }) => void;
    addToolCall: ({ step }: {
        step: ToolCallStep;
    }) => void;
    setToolCallProgress: ({ progress, toolCallId, }: {
        progress: ToolCallProgress;
        toolCallId: string;
    }) => void;
    setToolCallResult: ({ results, toolCallId, }: {
        results: ToolResult[];
        toolCallId: string;
    }) => void;
    setAssistantMessage: ({ assistantMessage }: {
        assistantMessage: string;
    }) => void;
    addAssistantMessageChunk: ({ messageChunk }: {
        messageChunk: string;
    }) => void;
    setTimeToFirstToken: ({ timeToFirstToken }: {
        timeToFirstToken: number;
    }) => void;
    addPendingPrompt: ({ prompt }: {
        prompt: PromptRequest;
    }) => void;
    clearPendingPrompts: () => void;
    onConversationCreated: ({ title }: {
        title: string;
    }) => void;
    addBackgroundExecutionCompleteStep: ({ step }: {
        step: BackgroundAgentCompleteStep;
    }) => void;
    addOrUpdateTodosStep: ({ todos }: {
        todos: TodoItem[];
    }) => void;
    addCompactionStep: ({ tokenCountBefore }: {
        tokenCountBefore: number;
    }) => void;
    setCompactionStepComplete: ({ tokenCountAfter, summarizedRoundCount, }: {
        tokenCountAfter: number;
        summarizedRoundCount: number;
    }) => void;
    deleteConversation: (id: string) => Promise<void>;
    renameConversation: (id: string, title: string) => Promise<void>;
}
interface UseConversationActionsParams {
    conversationId?: string;
    queryClient: QueryClient;
    conversationsService: ConversationsService;
    onDeleteConversation?: (params: {
        id: string;
        isCurrentConversation: boolean;
    }) => void;
}
export declare const createConversationActions: ({ conversationId, queryClient, conversationsService, onDeleteConversation, }: UseConversationActionsParams) => ConversationActions;
export declare const useConversationActions: ({ conversationId, queryClient, conversationsService, onDeleteConversation, }: UseConversationActionsParams) => ConversationActions;
export {};

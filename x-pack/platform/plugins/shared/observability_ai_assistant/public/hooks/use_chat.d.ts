import type { NotificationsStart } from '@kbn/core/public';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import type { ConversationCreateEvent, ConversationUpdateEvent } from '../../common';
import { type Message } from '../../common';
import type { ObservabilityAIAssistantChatService, ObservabilityAIAssistantService } from '..';
export declare enum ChatState {
    Ready = "ready",
    Loading = "loading",
    Error = "error",
    Aborted = "aborted"
}
export interface UseChatResult {
    messages: Message[];
    setMessages: (messages: Message[]) => void;
    state: ChatState;
    next: (messages: Message[], onError?: (error: any) => void) => void;
    stop: () => void;
}
interface UseChatPropsWithoutContext {
    notifications: NotificationsStart;
    initialMessages: Message[];
    initialConversationId?: string;
    service: ObservabilityAIAssistantService;
    chatService: ObservabilityAIAssistantChatService;
    connectorId?: string;
    persist: boolean;
    disableFunctions?: boolean;
    onConversationUpdate?: (event: ConversationCreateEvent | ConversationUpdateEvent) => void;
    onChatComplete?: (messages: Message[]) => void;
    scopes: AssistantScope[];
}
export type UseChatProps = Omit<UseChatPropsWithoutContext, 'notifications'>;
export declare function useChat(props: UseChatProps): UseChatResult;
export declare function createUseChat({ notifications }: {
    notifications: NotificationsStart;
}): (parameters: Omit<UseChatProps, "notifications">) => UseChatResult;
export {};

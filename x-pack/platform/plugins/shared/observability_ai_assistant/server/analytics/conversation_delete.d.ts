import type { EventTypeOpts } from '@kbn/core/server';
export type ConversationDeleteEvent = Record<string, never>;
export declare const conversationDeleteEventType = "observability_ai_assistant_conversation_delete";
export declare const conversationDeleteEvent: EventTypeOpts<ConversationDeleteEvent>;

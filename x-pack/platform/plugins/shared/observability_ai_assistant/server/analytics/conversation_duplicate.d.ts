import type { EventTypeOpts } from '@kbn/core/server';
export type ConversationDuplicateEvent = Record<string, never>;
export declare const conversationDuplicateEventType = "observability_ai_assistant_conversation_duplicate";
export declare const conversationDuplicateEvent: EventTypeOpts<ConversationDuplicateEvent>;

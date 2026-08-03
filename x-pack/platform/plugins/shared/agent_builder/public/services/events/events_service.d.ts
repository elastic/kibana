import type { Observable } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { ActiveConversation, BrowserChatEvent } from '@kbn/agent-builder-browser/events';
export declare class EventsService {
    private readonly events$;
    /**
     * @deprecated Backed by a single shared `Subject` that interleaves events from every
     * conversation. With concurrent per-conversation streams, consumers cannot reliably
     * attribute an event to its source conversation from this stream alone. Use
     * `getChatEvents$(conversationId)` for per-conversation scoping.
     */
    readonly obs$: Observable<BrowserChatEvent>;
    private readonly activeConversationState$;
    readonly activeConversation$: Observable<ActiveConversation | null>;
    constructor();
    propagateChatEvent(conversationId: string, event: ChatEvent): void;
    /**
     * Returns a hot observable of chat events scoped to a single conversation. Subscribe
     * any time during the events service's lifetime; events emit live as the agent runs
     * the conversation. Subscribers only see events tagged with the matching id.
     */
    getChatEvents$(conversationId: string): Observable<BrowserChatEvent>;
    setActiveConversation(activeConversation: ActiveConversation | null): void;
    clearActiveConversation(): void;
    getActiveConversation(): ActiveConversation | null;
}

/**
 * Publishes the active conversation to the shared `EventsService` whenever the
 * conversation id or fetch state changes, and resets it to `null` when the
 * subtree unmounts (e.g. the user navigates away from the full-page chat or
 * closes the sidebar).
 */
export declare const ConversationChangeNotifier: () => null;

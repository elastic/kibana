/**
 * Single source of truth for "send this message". The conversationId is always passed explicitly
 * to the mutation — for an existing conversation it's just the current id, for a new conversation
 * it's a freshly minted UUID. The mutation never reads conversationId from context closure.
 *
 * For new conversations we also need to transition the user to the new id — that means a URL
 * navigation in the routed app, or an internal state update in the embeddable. We branch on
 * `isEmbeddedContext` rather than asking each provider to expose its own helper.
 */
export declare const useSubmitMessage: () => (message: string) => void;

/**
 * Auto-send an initial message when one is provided via location state (workplace_ai_app
 * deep-link -> `/conversations/new`) or via embeddable props (host opens with `initialMessage` +
 * `autoSendInitialMessage: true`). Only fires when there is no `conversationId` yet — a refresh
 * on `/conversations/<uuid>` shouldn't replay the original message.
 *
 * Routes through `useSubmitMessage` so deep-link sends take the same UUID-generation +
 * navigation path as a user-typed submit.
 */
export declare const useSendPredefinedInitialMessage: () => null;

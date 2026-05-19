/**
 * Returns true while ANY conversation is streaming. Derived from the lifted
 * `activeStreams` map — `size > 0` means at least one stream is in flight.
 */
export declare const useIsAnyConversationStreaming: () => boolean;

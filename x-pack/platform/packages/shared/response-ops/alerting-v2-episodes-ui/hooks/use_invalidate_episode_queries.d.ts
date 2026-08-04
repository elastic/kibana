/**
 * Returns a stable callback that invalidates every episode-scoped query key
 * affected by an episode action (ack, snooze, resolve, tag, assignee, etc.).
 *
 * Use this in `onSuccess` handlers wherever episode actions are dispatched
 * (e.g. bulk and row actions on the table) to keep any other mounted consumer
 * of these queries — including an open details flyout sharing the same
 * `QueryClient` — in sync with the updated state.
 */
export declare const useInvalidateEpisodeQueries: () => () => Promise<[void, void, void, void, void, void, void, void, void, void, void]>;

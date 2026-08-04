/**
 * Low-level fetcher: one `bulk_get` per `(soType, set-of-ids)`. Returns a
 * map keyed by id. Used directly by `SavedObjectInAppUrlsProvider` to
 * pre-resolve URLs for the entire case in one shot, and as the fallback for
 * the public `useSavedObjectInAppUrls`/`useSavedObjectInAppUrl` hooks when
 * no provider is mounted above them.
 */
export declare const useSavedObjectInAppUrlsQuery: (soType: string, ids: string[]) => Record<string, string | undefined>;
/**
 * Resolves in-app URLs for a batch of saved objects of the same type. When a
 * `SavedObjectInAppUrlsProvider` is mounted above (the normal case inside
 * `CaseViewPage`), reads from the case-wide pre-resolved map and avoids any
 * request. Otherwise falls back to its own `bulk_get`.
 */
export declare const useSavedObjectInAppUrls: (soType: string, ids: string[]) => Record<string, string | undefined>;
/** Convenience wrapper for the single-id case. */
export declare const useSavedObjectInAppUrl: (soType: string, id: string | undefined) => string | undefined;

import type { ApplicationStart } from '@kbn/core/public';
import type { ESQLSourceResult } from '@kbn/esql-types';
import type { StreamsRepositoryClient } from '../api';
export declare const STREAMS_CACHE_TTL_MS = 60000;
/**
 * Creates a source enricher function that adds Streams metadata to ES|QL source suggestions.
 *
 * When registered with the ESQL plugin, this enricher fetches metadata only for the streams
 * that match the given sources, using a per-stream LRU cache with TTL. Only managed streams
 * (stored in .kibana_streams) are enriched; unmanaged data streams are left as-is.
 *
 * Cache hits are served immediately. Cache misses are batched within a single microtask
 * tick and resolved with a single `_bulk_get_summaries` API call. Concurrent requests for
 * the same key are deduplicated natively by LRUCache's `fetchMethod` mechanism.
 *
 * @param repositoryClient - Streams repository client for fetching stream definitions
 * @param application - Promise resolving to the Core Application service
 * @param perf - Optional performance-like object with a `now()` method; defaults to `performance`.
 *               Injectable for testing to control TTL expiry without global timer mocks.
 */
export declare function createStreamsSourceEnricher(repositoryClient: StreamsRepositoryClient, application: Promise<Pick<ApplicationStart, 'getUrlForApp'>>, perf?: {
    now: () => number;
}): (sources: ESQLSourceResult[]) => Promise<ESQLSourceResult[]>;

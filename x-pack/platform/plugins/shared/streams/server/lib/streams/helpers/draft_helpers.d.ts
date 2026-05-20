import type { IScopedClusterClient } from '@kbn/core/server';
import type { SearchHit } from '@kbn/es-types';
import type { ESQLAstItem } from '@elastic/esql/types';
import type { Streams } from '@kbn/streams-schema';
import type { StreamsClient } from '../client';
/**
 * Walks up the ancestor chain from a draft stream to find the first
 * ancestor with a backing data stream (i.e. not also a draft).
 * Handles nested drafts: draft → draft → materialized parent.
 */
export declare function resolveFirstNonDraftAncestor(streamsClient: StreamsClient, streamName: string): Promise<string>;
/**
 * For draft streams, determines unmapped fields by combining two sources:
 *
 * 1. View columns — includes fields created by processing (EVAL, DISSECT,
 *    GROK, etc.) that may not exist in the raw _source. These take priority.
 * 2. METADATA _source — the raw document source, which surfaces truly
 *    unmapped fields that ES|QL's column schema alone may miss.
 *
 * Both sets are unioned and filtered against the stream's defined mappings.
 */
export declare function getUnmappedFieldsFromView(scopedClusterClient: IScopedClusterClient, streamsClient: StreamsClient, definition: Streams.WiredStream.Definition): Promise<string[]>;
/**
 * Fetches sample documents from a draft stream's ES|QL view.
 *
 * The view encapsulates routing conditions and processing transforms,
 * so the returned documents reflect the post-processing state — the
 * same as fetching from a materialized stream's own index.
 *
 * Returns documents shaped as SearchHit-like objects suitable for
 * `simulate.ingest`, plus the first non-draft ancestor's data stream
 * name (needed for index template lookup in the simulation).
 */
export declare function fetchDraftViewSamples(scopedClusterClient: IScopedClusterClient, streamsClient: StreamsClient, streamName: string, options: {
    size: number;
    whereExpression?: ESQLAstItem;
}): Promise<{
    docs: Array<SearchHit<unknown>>;
    ancestorDataStream: string;
}>;

import type { IngestStreamIndexMode } from '../models/ingest/base';
import { Streams } from '../models/streams';
export interface GetDiscoverEsqlQueryOptions {
    /**
     * The stream definition to generate the query for
     */
    definition: Streams.all.Definition;
    /**
     * The index mode of the stream (from API response)
     */
    indexMode?: IngestStreamIndexMode;
    /**
     * Whether to include METADATA _source (typically for wired streams)
     */
    includeMetadata?: boolean;
    /**
     * Whether to use ES|QL view names for wired streams. Set to false on
     * serverless where the _query/view API is not available. Defaults to false.
     */
    useViews?: boolean;
}
/**
 * Generates a base ES|QL query for Discover from a stream definition.
 *
 * Uses 'TS' source command for TSDB mode streams, 'FROM' otherwise.
 * Optionally includes METADATA _source for wired streams.
 * Results are sorted by @timestamp descending by default for FROM queries.
 * TS (time series) queries do not add explicit sorting as TSDB data is inherently time-ordered.
 *
 * @param options - Configuration options for query generation
 * @returns The ES|QL query string, or undefined if index patterns cannot be determined
 *
 * @example
 * // Basic usage
 * getDiscoverEsqlQuery({ definition, indexMode })
 * // Returns: "FROM logs,logs.* | SORT @timestamp DESC"
 *
 * @example
 * // With TSDB mode (no explicit sort - TSDB is time-ordered)
 * getDiscoverEsqlQuery({ definition, indexMode: 'time_series' })
 * // Returns: "TS logs,logs.*"
 *
 * @example
 * // With metadata for wired streams
 * getDiscoverEsqlQuery({ definition, indexMode, includeMetadata: true })
 * // Returns: "FROM logs,logs.* METADATA _source | SORT @timestamp DESC"
 */
export declare function getDiscoverEsqlQuery(options: GetDiscoverEsqlQueryOptions): string | undefined;

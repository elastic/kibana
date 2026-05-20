import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { IStorageClient } from '@kbn/storage-adapter';
import type { QueryFeature } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema/src/models/streams';
import { type StreamQuery } from '@kbn/streams-schema/src/queries';
import { type Query, type QueryLink, type QueryLinkRequest, type QueryUnlinkRequest, type SearchMode } from '../../../../../common/queries';
import type { QUERY_DESCRIPTION, QUERY_ESQL_QUERY, QUERY_FEATURES, QUERY_SEVERITY_SCORE, QUERY_TITLE, QUERY_TYPE, STREAM_NAME } from '../fields';
import type { QueryStorageSettings } from '../storage_settings';
import { type SigEventsTuningConfig } from '../../../../../common/sig_events_tuning_config';
export type RuleUnbackedFilter = 'exclude' | 'include' | 'only';
export interface QueryLinkFilters {
    ruleUnbacked?: RuleUnbackedFilter;
    queryIds?: string[];
    minSeverityScore?: number;
}
export declare function getQueryLinkUuid(name: string, asset: Pick<QueryLink, 'asset.id' | 'asset.type'>): string;
type QueryLinkStorageFields = Omit<QueryLink, 'query' | 'stream_name'> & {
    [QUERY_TITLE]: string;
    [QUERY_DESCRIPTION]: string;
    [QUERY_ESQL_QUERY]: string;
    [QUERY_SEVERITY_SCORE]?: number;
    [QUERY_TYPE]?: string;
    [QUERY_FEATURES]?: QueryFeature[];
};
export type StoredQueryLink = QueryLinkStorageFields & {
    [STREAM_NAME]: string;
};
export declare function buildSearchEmbeddingText(query: Pick<StreamQuery, 'title' | 'description'>, streamName?: string): string;
/** Operations accepted by {@link QueryClient.bulk} (stream queries + id deletes). */
export interface QueryClientBulkOperation {
    index?: StreamQuery;
    delete?: {
        id: string;
    };
}
/** Index-only bulk operation for {@link QueryClient.bulk}. */
export interface QueryClientBulkIndexOperation {
    index: StreamQuery;
}
export declare class QueryClient {
    private readonly dependencies;
    private readonly isSignificantEventsEnabled;
    private readonly config;
    constructor(dependencies: {
        storageClient: IStorageClient<QueryStorageSettings, StoredQueryLink>;
        soClient: SavedObjectsClientContract;
        rulesClient: RulesClient;
        logger: Logger;
    }, isSignificantEventsEnabled?: boolean, config?: Pick<SigEventsTuningConfig, 'semantic_min_score' | 'rrf_rank_constant'>);
    syncQueryList(definition: Streams.all.Definition, links: QueryLinkRequest[]): Promise<{
        deleted: QueryLink[];
        indexed: QueryLink[];
    }>;
    unlinkQuery(name: string, asset: QueryUnlinkRequest): Promise<void>;
    clean(): Promise<void>;
    getStreamToQueryLinksMap(names: string[]): Promise<Record<string, QueryLink[]>>;
    /**
     * Returns all query links for given streams or
     * all query links if no stream names are provided.
     */
    getQueryLinks(streamNames: string[], filters?: QueryLinkFilters): Promise<QueryLink[]>;
    /**
     * Returns the raw unbacked set for a stream, including STATS. Used by
     * {@link promoteQueries} to count STATS it must skip. For the promotable
     * set (STATS excluded), use {@link getPromotableUnbackedQueries}.
     */
    private getUnbackedQueries;
    /**
     * Shared bool-query shape for the promotable-unbacked set: `rule_backed=false`
     * AND `type != STATS`, with optional severity floor. Used by
     * {@link getPromotableUnbackedQueries} and {@link promoteUnbackedQueries}.
     */
    private promotableUnbackedBoolQuery;
    /**
     * Returns all unbacked, non-STATS queries across streams.
     */
    getPromotableUnbackedQueries(filters?: {
        minSeverityScore?: number;
    }): Promise<QueryLink[]>;
    /**
     * Promotes the promotable-unbacked set (filtered by `queryIds` if provided)
     * to rule-backed status, grouped by stream.
     *
     * Non-obvious behavior:
     * - `queryIds` referring to STATS/backed/missing queries are silently
     *   dropped, so `skipped_stats` is reliably `0` from this entry point.
     * - `streamDefinitions` is injected because `streamsClient` is not a
     *   `QueryClient` dependency; callers build it from `listStreams()`.
     */
    promoteUnbackedQueries({ queryIds, minSeverityScore, streamDefinitions, }: {
        queryIds?: string[];
        minSeverityScore?: number;
        streamDefinitions: Map<string, Streams.all.Definition>;
    }): Promise<{
        promoted: number;
        skipped_stats: number;
    }>;
    bulkGetByIds(name: string, ids: string[]): Promise<QueryLink[]>;
    findQueries(streamNames: string[], query: string, filters?: QueryLinkFilters, searchMode?: SearchMode): Promise<QueryLink[]>;
    private executeFindQueries;
    private findQueriesByKeyword;
    private findQueriesBySemantic;
    private findQueriesByHybrid;
    private bulkStorage;
    getAssets(name: string): Promise<Query[]>;
    syncQueries(definition: Streams.all.Definition, queries: StreamQuery[]): Promise<void>;
    upsert(definition: Streams.all.Definition, query: StreamQuery): Promise<void>;
    delete(definition: Streams.all.Definition, queryId: string): Promise<void>;
    deleteAll(definition: Streams.all.Definition): Promise<void>;
    bulk(definition: Streams.all.Definition, operations: QueryClientBulkOperation[], options?: {
        createRules?: boolean;
    }): Promise<void>;
    /**
     * Creates Kibana rules for stored queries that do not have a backing rule, then marks them as backed.
     */
    promoteQueries(definition: Streams.all.Definition, queryIds: string[]): Promise<{
        promoted: number;
        skipped_stats: number;
    }>;
    /**
     * Removes backing Kibana rules for stored rule-backed queries, then marks them as unbacked.
     */
    demoteQueries(definition: Streams.all.Definition, queryIds: string[]): Promise<{
        demoted: number;
    }>;
    private installQueries;
    private uninstallQueries;
    private toCreateRuleParams;
    private toUpdateRuleParams;
}
export {};

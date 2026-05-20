import type { MappingRuntimeFields, QueryDslFieldAndFormat, QueryDslQueryContainer, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { type ComposerQueryTagHole } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
type WhereCondition = ESQLAstExpression & ComposerQueryTagHole;
interface GetSampleDocumentsEsqlParams {
    esClient: ElasticsearchClient;
    index: string | string[];
    start: number;
    end: number;
    kql?: string;
    size?: number;
    sampleSize?: number;
    whereCondition?: WhereCondition;
    /**
     * Controls the ES|QL `SET unmapped_fields=...` prefix:
     * - `'LOAD'` reads unmapped fields from `_source` (used by the entity-filter
     *   sampling arm to query source-only fields).
     * - `'NULLIFY'` nullifies unmapped fields so full-text-search functions like
     *   `MATCH_PHRASE` skip them silently instead of raising
     *   `verification_exception: Unknown column [...]`.
     * Omitted means ES|QL uses its default unmapped-field behavior (any direct
     * reference to an unmapped column is a verification error).
     */
    unmappedFields?: 'LOAD' | 'NULLIFY';
    /**
     * Optional Query DSL filter clauses forwarded as the ES|QL `_query` request's
     * `filter` parameter. ES applies these at the request layer (before the ES|QL
     * pipeline runs), so callers can pass raw fixture-style DSL (`term`, `terms`,
     * `match`, `match_phrase`, `exists`, `bool { should, minimum_should_match }`,
     * ...) without translating to KQL. Multiple clauses are ANDed with the
     * internal date-range filter.
     */
    dslFilter?: QueryDslQueryContainer | QueryDslQueryContainer[];
}
interface GetSampleDocumentsEsqlResponse {
    hits: Array<SearchHit<Record<string, unknown>>>;
    total: number;
}
export declare function getSampleDocuments({ esClient, index, start, end, kql, filter, size, fields, _source, timeout, runtime_mappings, }: {
    esClient: ElasticsearchClient;
    index: string | string[];
    start: number;
    end: number;
    kql?: string;
    size?: number;
    filter?: QueryDslQueryContainer | QueryDslQueryContainer[];
    fields?: Array<QueryDslFieldAndFormat | string>;
    _source?: boolean;
    timeout?: string;
    runtime_mappings?: MappingRuntimeFields;
}): Promise<{
    hits: Array<SearchHit<Record<string, any>>>;
    total: number;
}>;
/**
 * ES|QL-native companion to `getSampleDocuments` for callers that must sample
 * from remote clusters or external data sources where classic search APIs are
 * not available. The helper returns `_source`-backed hits instead of `fields`
 * hits, which keeps downstream document formatting compatible while avoiding
 * Query DSL.
 *
 * When `sampleSize` is provided, ES|QL has no `random_score` equivalent, and
 * `SAMPLE p | LIMIT n` returns sampled rows in storage order. To preserve the
 * old random-sampling behavior, this first counts the matching population,
 * oversamples with `SAMPLE`, shuffles the returned rows client-side, then trims
 * to the requested size.
 *
 * `unmappedFields` emits `SET unmapped_fields="<mode>"` so ES|QL predicates
 * can evaluate source-only fields (`'LOAD'`, replaces the older fieldCaps +
 * runtime_mappings path for entity-filtered sampling) or silently nullify
 * unmapped columns (`'NULLIFY'`, required when the `WHERE` includes
 * `MATCH_PHRASE` / `MATCH` against fields that may not be mapped on every
 * backing index — DSL `match_phrase` no-matches missing fields, but bare
 * ES|QL full-text functions raise `verification_exception` instead).
 */
export declare function getSampleDocumentsEsql({ esClient, index, start, end, kql, size, sampleSize, whereCondition, unmappedFields, dslFilter, }: GetSampleDocumentsEsqlParams): Promise<GetSampleDocumentsEsqlResponse>;
export {};

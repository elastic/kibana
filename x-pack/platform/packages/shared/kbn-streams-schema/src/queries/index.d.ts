import { z } from '@kbn/zod/v4';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { SignificantEventsResponse } from '../api/significant_events';
export interface EsqlQuery {
    query: string;
}
export declare const esqlQuerySchema: z.Schema<EsqlQuery>;
interface StreamQueryBase {
    id: string;
    title: string;
    description: string;
}
export declare const QUERY_TYPE_MATCH: "match";
export declare const QUERY_TYPE_STATS: "stats";
export type QueryType = typeof QUERY_TYPE_MATCH | typeof QUERY_TYPE_STATS;
/**
 * Minimum severity score for auto-creating backing rules.
 * Severity bands: Low < 40, Medium [40, 60), High [60, 80), Critical >= 80.
 * High + Critical queries are eligible for automatic rule creation.
 */
export declare const HIGH_SEVERITY_THRESHOLD = 60;
export declare const queryTypeSchema: z.ZodEnum<{
    stats: "stats";
    match: "match";
}>;
export declare const queryFeatureSchema: z.ZodObject<{
    id: z.ZodString;
    run_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type QueryFeature = z.infer<typeof queryFeatureSchema>;
export interface StreamQuery extends StreamQueryBase {
    type: QueryType;
    esql: EsqlQuery;
    severity_score?: number;
    evidence?: string[];
    features?: QueryFeature[];
}
/**
 * The `type` default exists for backward compatibility with pre-migration
 * stored documents that lack a type field. For all new writes the type MUST
 * be derived server-side via {@link deriveQueryType} — never trust the default.
 */
export declare const streamQuerySchema: z.Schema<StreamQuery>;
export declare const querySchema: z.ZodType<QueryDslQueryContainer>;
/**
 * Wire schema for creating/updating a query. The `type` field is intentionally
 * omitted — the server derives it from the ES|QL content via `deriveQueryType`
 * on every write, so client-supplied values would be ignored.
 */
export declare const upsertStreamQueryRequestSchema: z.ZodObject<{
    title: z.ZodString;
    esql: z.ZodType<EsqlQuery, unknown, z.core.$ZodTypeInternals<EsqlQuery, unknown>>;
    severity_score: z.ZodOptional<z.ZodNumber>;
    evidence: z.ZodOptional<z.ZodArray<z.ZodString>>;
    description: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
/**
 * Wire schema for the bulk endpoint index operations.
 * Same as {@link upsertStreamQueryRequestSchema} but with `id` included,
 * and `type` intentionally omitted — derived server-side.
 */
export declare const bulkStreamQueryInputSchema: z.ZodObject<{
    title: z.ZodString;
    esql: z.ZodType<EsqlQuery, unknown, z.core.$ZodTypeInternals<EsqlQuery, unknown>>;
    severity_score: z.ZodOptional<z.ZodNumber>;
    evidence: z.ZodOptional<z.ZodArray<z.ZodString>>;
    description: z.ZodDefault<z.ZodString>;
    id: z.ZodString;
}, z.core.$strip>;
export interface QueriesGetResponse {
    queries: SignificantEventsResponse[];
    page: number;
    perPage: number;
    total: number;
}
export interface QueriesOccurrencesGetResponse {
    occurrences_histogram: Array<{
        x: string;
        y: number;
    }>;
    total_occurrences: number;
}
export interface QueryLink {
    'asset.uuid': string;
    'asset.type': 'query';
    'asset.id': string;
    query: StreamQuery;
    stream_name: string;
    /** Whether a Kibana rule exists for this query. */
    rule_backed: boolean;
    /** The deterministic ID of the Kibana rule associated with this query. */
    rule_id: string;
}
export {};

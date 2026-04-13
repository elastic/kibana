import type { Filter, TimeRange } from '@kbn/es-query';
import type { SampleDocument } from '@kbn/streams-schema/src/shared/record_types';
import { z } from '@kbn/zod';
/**
 * Base interface for all data source types with common properties
 */
export interface BaseDataSource {
    enabled: boolean;
    name?: string;
}
/**
 * Random samples data source that retrieves data from the stream index
 */
export interface LatestSamplesDataSource extends BaseDataSource {
    type: 'latest-samples';
}
export interface FailureStoreDataSource extends BaseDataSource {
    type: 'failure-store';
    timeRange?: TimeRange;
}
/**
 * KQL samples data source that retrieves data based on KQL query
 */
export interface KqlSamplesDataSource extends BaseDataSource {
    type: 'kql-samples';
    query: {
        language: string;
        query: string;
    };
    filters?: Filter[];
    timeRange?: TimeRange;
}
/**
 * Custom samples data source with user-provided documents
 */
export interface CustomSamplesDataSource extends BaseDataSource {
    type: 'custom-samples';
    documents: SampleDocument[];
    storageKey?: string;
}
export declare const customSamplesDataSourceDocumentsSchema: z.ZodArray<z.ZodType<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord, z.ZodTypeDef, import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord>, "many">;
export declare const customSamplesDataSourceSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    name: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodLiteral<"custom-samples">;
    documents: z.ZodArray<z.ZodType<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord, z.ZodTypeDef, import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord>, "many">;
    storageKey: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "custom-samples";
    enabled: boolean;
    documents: import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[];
    name?: string | undefined;
    storageKey?: string | undefined;
}, {
    type: "custom-samples";
    enabled: boolean;
    documents: import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[];
    name?: string | undefined;
    storageKey?: string | undefined;
}>;
/**
 * Union type of all possible data source types
 */
export type EnrichmentDataSource = LatestSamplesDataSource | KqlSamplesDataSource | CustomSamplesDataSource | FailureStoreDataSource;
/**
 * URL state for enrichment configuration
 */
export interface EnrichmentUrlState {
    v: 1;
    dataSources: EnrichmentDataSource[];
}
/**
 * Schema for validating enrichment URL state
 */
export declare const enrichmentUrlSchema: z.ZodObject<{
    v: z.ZodLiteral<1>;
    dataSources: z.ZodArray<z.ZodUnion<[z.ZodObject<{
        enabled: z.ZodBoolean;
        name: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"latest-samples">;
    }, "strip", z.ZodTypeAny, {
        type: "latest-samples";
        enabled: boolean;
        name?: string | undefined;
    }, {
        type: "latest-samples";
        enabled: boolean;
        name?: string | undefined;
    }>, z.ZodObject<{
        enabled: z.ZodBoolean;
        name: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"kql-samples">;
        query: z.ZodObject<{
            language: z.ZodString;
            query: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            query: string;
            language: string;
        }, {
            query: string;
            language: string;
        }>;
        filters: z.ZodOptional<z.ZodArray<z.ZodAny, "many">>;
        timeRange: z.ZodOptional<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            from: string;
            to: string;
        }, {
            from: string;
            to: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        query: {
            query: string;
            language: string;
        };
        type: "kql-samples";
        enabled: boolean;
        name?: string | undefined;
        filters?: any[] | undefined;
        timeRange?: {
            from: string;
            to: string;
        } | undefined;
    }, {
        query: {
            query: string;
            language: string;
        };
        type: "kql-samples";
        enabled: boolean;
        name?: string | undefined;
        filters?: any[] | undefined;
        timeRange?: {
            from: string;
            to: string;
        } | undefined;
    }>, z.ZodObject<{
        enabled: z.ZodBoolean;
        name: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"custom-samples">;
        documents: z.ZodArray<z.ZodType<import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord, z.ZodTypeDef, import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord>, "many">;
        storageKey: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "custom-samples";
        enabled: boolean;
        documents: import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[];
        name?: string | undefined;
        storageKey?: string | undefined;
    }, {
        type: "custom-samples";
        enabled: boolean;
        documents: import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[];
        name?: string | undefined;
        storageKey?: string | undefined;
    }>, z.ZodObject<{
        enabled: z.ZodBoolean;
        name: z.ZodOptional<z.ZodString>;
    } & {
        type: z.ZodLiteral<"failure-store">;
        timeRange: z.ZodOptional<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            from: string;
            to: string;
        }, {
            from: string;
            to: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "failure-store";
        enabled: boolean;
        name?: string | undefined;
        timeRange?: {
            from: string;
            to: string;
        } | undefined;
    }, {
        type: "failure-store";
        enabled: boolean;
        name?: string | undefined;
        timeRange?: {
            from: string;
            to: string;
        } | undefined;
    }>]>, "many">;
}, "strip", z.ZodTypeAny, {
    v: 1;
    dataSources: ({
        type: "latest-samples";
        enabled: boolean;
        name?: string | undefined;
    } | {
        type: "failure-store";
        enabled: boolean;
        name?: string | undefined;
        timeRange?: {
            from: string;
            to: string;
        } | undefined;
    } | {
        query: {
            query: string;
            language: string;
        };
        type: "kql-samples";
        enabled: boolean;
        name?: string | undefined;
        filters?: any[] | undefined;
        timeRange?: {
            from: string;
            to: string;
        } | undefined;
    } | {
        type: "custom-samples";
        enabled: boolean;
        documents: import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[];
        name?: string | undefined;
        storageKey?: string | undefined;
    })[];
}, {
    v: 1;
    dataSources: ({
        type: "latest-samples";
        enabled: boolean;
        name?: string | undefined;
    } | {
        type: "failure-store";
        enabled: boolean;
        name?: string | undefined;
        timeRange?: {
            from: string;
            to: string;
        } | undefined;
    } | {
        query: {
            query: string;
            language: string;
        };
        type: "kql-samples";
        enabled: boolean;
        name?: string | undefined;
        filters?: any[] | undefined;
        timeRange?: {
            from: string;
            to: string;
        } | undefined;
    } | {
        type: "custom-samples";
        enabled: boolean;
        documents: import("@kbn/streams-schema/src/shared/record_types").RecursiveRecord[];
        name?: string | undefined;
        storageKey?: string | undefined;
    })[];
}>;

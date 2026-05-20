import type { IStorageClient } from '@kbn/storage-adapter';
import type { Logger } from '@kbn/core/server';
import type { BaseFeature, Feature } from '@kbn/streams-schema';
import type { FeatureStorageSettings } from './storage_settings';
import type { StoredFeature } from './stored_feature';
import type { SearchMode } from '../../../../common/queries';
import { type SigEventsTuningConfig } from '../../../../common/sig_events_tuning_config';
export declare function buildSearchEmbeddingText(feature: BaseFeature, streamName?: string): string;
interface FeatureBulkIndexOperation {
    index: {
        feature: Feature;
    };
}
interface FeatureBulkDeleteOperation {
    delete: {
        id: string;
    };
}
interface FeatureBulkExcludeOperation {
    exclude: {
        id: string;
    };
}
interface FeatureBulkRestoreOperation {
    restore: {
        id: string;
    };
}
export type FeatureBulkOperation = FeatureBulkIndexOperation | FeatureBulkDeleteOperation | FeatureBulkExcludeOperation | FeatureBulkRestoreOperation;
export declare class FeatureClient {
    private readonly clients;
    private readonly config;
    constructor(clients: {
        storageClient: IStorageClient<FeatureStorageSettings, StoredFeature>;
        logger: Logger;
    }, config?: Pick<SigEventsTuningConfig, 'feature_ttl_days' | 'semantic_min_score' | 'rrf_rank_constant'>);
    private get maxFeatureAgeMs();
    clean(): Promise<void>;
    bulk(stream: string, operations: FeatureBulkOperation[]): Promise<{
        applied: number;
        skipped: number;
    }>;
    getFeatures(streams: string | string[], options?: {
        type?: string[];
        id?: string[];
        minConfidence?: number;
        limit?: number;
        includeExcluded?: boolean;
        includeExpired?: boolean;
        sort?: Array<Record<string, {
            order: 'asc' | 'desc';
        }>>;
    }): Promise<{
        hits: Feature[];
        total: number;
    }>;
    getFeature(stream: string, uuid: string): Promise<{
        id: string;
        stream_name: string;
        type: string;
        description: string;
        properties: Record<string, unknown>;
        confidence: number;
        subtype?: string | undefined;
        title?: string | undefined;
        evidence?: string[] | undefined;
        evidence_doc_ids?: string[] | undefined;
        tags?: string[] | undefined;
        filter?: import("@kbn/streamlang").Condition | undefined;
        meta?: Record<string, unknown> | undefined;
    } & {
        uuid: string;
        status: "active" | "expired" | "stale";
        last_seen: string;
        expires_at?: string | undefined;
        excluded_at?: string | undefined;
        run_id?: string | undefined;
    }>;
    /**
     * Resolves a list of feature UUIDs to their owning stream by querying storage
     * directly on `_id` (which is the UUID by construction — see `bulk` above).
     * UUIDs that do not exist in storage are simply absent from the result; the
     * caller can compute "not found" as `input.length - result.length` (deduped)
     * and treat them as idempotent no-ops.
     */
    findFeaturesByUuids(uuids: string[]): Promise<Array<{
        uuid: string;
        stream_name: string;
    }>>;
    deleteFeature(stream: string, uuid: string): Promise<import("@kbn/storage-adapter").StorageClientDeleteResponse>;
    deleteFeatures(stream: string): Promise<import("@elastic/elasticsearch/lib/api/types").BulkResponse>;
    getExcludedFeatures(stream: string): Promise<{
        hits: Feature[];
        total: number;
    }>;
    findFeatures(streams: string | string[], query: string, options?: {
        searchMode?: SearchMode;
        includeExpired?: boolean;
        includeExcluded?: boolean;
        limit?: number;
    }): Promise<{
        hits: Feature[];
        total: number;
    }>;
    private executeFindFeatures;
    private findFeaturesByKeyword;
    private findFeaturesBySemantic;
    private findFeaturesByHybrid;
    private filterValidOperations;
    findDuplicateFeature({ existingFeatures, feature, }: {
        existingFeatures: Feature[];
        feature: BaseFeature;
    }): Feature | undefined;
}
export {};

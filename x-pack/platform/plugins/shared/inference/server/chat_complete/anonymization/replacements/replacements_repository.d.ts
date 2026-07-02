import type { ElasticsearchClient } from '@kbn/core/server';
import type { ReplacementsSet } from '@kbn/anonymization-common';
interface CreateReplacementsParams {
    id?: string;
    replacements: Array<{
        anonymized: string;
        original: string;
    }>;
    namespace: string;
    createdBy: string;
}
interface UpdateReplacementsParams {
    /** New replacements to merge into the existing set. */
    replacements: Array<{
        anonymized: string;
        original: string;
    }>;
}
/**
 * Repository for CRUD operations on anonymization replacements sets.
 * Owned by the inference plugin.
 */
export declare class ReplacementsRepository {
    private readonly esClient;
    private readonly encryptionKey;
    constructor(esClient: ElasticsearchClient, options?: {
        encryptionKey?: string;
    });
    private deriveKey;
    private encryptValue;
    private decryptValue;
    private serializeOriginal;
    private deserializeOriginal;
    private setStatusCode;
    private isVersionConflict;
    private dedupeAndValidate;
    toTokenToOriginalMap(replacements: ReplacementsSet): Record<string, string>;
    /**
     * Creates a new replacements set.
     */
    create(params: CreateReplacementsParams): Promise<ReplacementsSet>;
    /**
     * Gets a replacements set by ID within a namespace.
     */
    get(namespace: string, replacementsId: string): Promise<ReplacementsSet | null>;
    /**
     * Updates an existing replacements set by merging in new replacement mappings.
     * Deduplicates by anonymized token and rejects conflicting mappings.
     */
    update(namespace: string, replacementsId: string, params: UpdateReplacementsParams): Promise<ReplacementsSet | null>;
    /**
     * Converts an ES document to the public ReplacementsSet type.
     */
    private toReplacementsSet;
}
export {};

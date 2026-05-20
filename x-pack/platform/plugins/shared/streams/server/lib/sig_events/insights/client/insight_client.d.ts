import type { IStorageClient } from '@kbn/storage-adapter';
import type { Insight, InsightImpactLevel } from '@kbn/streams-schema';
import type { InsightStorageSettings } from './storage_settings';
interface InsightBulkIndexOperation {
    index: Insight;
}
interface InsightBulkDeleteOperation {
    delete: {
        id: string;
    };
}
export type InsightBulkOperation = InsightBulkIndexOperation | InsightBulkDeleteOperation;
export declare class InsightClient {
    private readonly clients;
    constructor(clients: {
        storageClient: IStorageClient<InsightStorageSettings, Insight>;
    });
    clean(): Promise<void>;
    /**
     * Upsert an insight (create or overwrite).
     */
    upsert(insight: Insight): Promise<Insight>;
    /**
     * Get a single insight by ID
     */
    get(id: string): Promise<Insight>;
    /**
     * List all insights with optional filters
     */
    list(filters?: {
        impact?: InsightImpactLevel[];
    }): Promise<{
        insights: Insight[];
        total: number;
    }>;
    /**
     * Delete an insight by ID
     */
    delete(id: string): Promise<{
        acknowledged: boolean;
    }>;
    /**
     * Bulk operations for insights (save/delete only)
     */
    bulk(operations: InsightBulkOperation[]): Promise<{
        acknowledged: boolean;
    }>;
}
export {};

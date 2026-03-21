import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { SmlTypeDefinition, SmlCrawler } from './types';
import type { SmlIndexer } from './sml_indexer';
export type { SmlCrawler };
export interface SmlCrawlerDeps {
    indexer: SmlIndexer;
    logger: Logger;
}
export declare class SmlCrawlerImpl implements SmlCrawler {
    private readonly indexer;
    private readonly logger;
    constructor({ indexer, logger }: SmlCrawlerDeps);
    crawl({ definition, esClient, savedObjectsClient, abortSignal, }: {
        definition: SmlTypeDefinition;
        esClient: ElasticsearchClient;
        savedObjectsClient: ISavedObjectsRepository;
        abortSignal?: AbortSignal;
    }): Promise<void>;
    /**
     * Check whether we need to force a full re-index due to data integrity mismatch.
     * Returns true if state has docs but the SML data index is empty.
     */
    private checkDataIntegrity;
    /**
     * Process a single page of source items: batch-lookup state, diff,
     * and write state updates with last_crawled_at stamped.
     */
    private processPage;
    /**
     * Process all queued actions (non-null update_action) for a type.
     * Uses `search_after` to paginate through all pending items.
     */
    private processQueue;
    /**
     * Count how many documents exist in the SML data index for a given attachment type.
     * Returns 0 if the index doesn't exist yet.
     */
    private countSmlDocuments;
    /**
     * Batch-lookup state documents by their IDs using mget-style terms query.
     * Returns a map of origin_id → state document.
     */
    private batchLookupState;
    /**
     * Write state operations via bulk API.
     */
    private writeStateOperations;
    /**
     * Mark-and-sweep: find state docs not seen in this crawl run
     * (last_crawled_at < crawlStartTime) and mark them for deletion.
     * Returns the number of items marked as deleted.
     */
    private sweepStaleState;
    /**
     * Count how many state docs exist for a given attachment type.
     */
    private countStateDocs;
}

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
/**
 * Backfills ES|QL views for all wired streams that are missing them.
 *
 * Uses a series of increasingly expensive checks to avoid unnecessary work:
 * 1. Check if .kibana_streams index exists (HEAD request)
 * 2. Check which root streams exist via targeted lookups (1-3 GET-by-ID)
 * 3. Check if those roots already have views (1-3 GET view)
 * 4. Only then load all wired streams for the actual backfill
 */
export declare function backfillWiredStreamViews({ esClient, logger, isWiredStreamViewsEnabled, }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    isWiredStreamViewsEnabled: boolean;
}): Promise<void>;

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Condition } from '@kbn/streamlang';
import type { FormattedDocumentAnalysis } from '@kbn/ai-tools';
export interface ClusterLogsResponse {
    sampled: number;
    noise: number[];
    clusters: Array<{
        count: number;
        analysis: FormattedDocumentAnalysis;
    }>;
}
/**
 * Extracts all field names from a condition, recursively handling
 * nested conditions (and, or, not).
 * @internal Exported for testing purposes only
 */
export declare function getFields(condition: Condition): string[];
/**
 * Cluster Elasticsearch documents by:
 * - getting 1000 docs per specified partition
 * - per result set, create clusters by using DBSCAN and Jaccard similarity
 *
 * Each cluster has its own document analysis.
 */
export declare function clusterLogs({ index, partitions, excludeConditions, esClient, start, end, size, logger, dropUnmapped, }: {
    index: string;
    partitions: Array<{
        name: string;
        condition: Condition;
    }>;
    excludeConditions?: Condition[];
    esClient: ElasticsearchClient;
    start: number;
    end: number;
    size?: number;
    logger: Logger;
    dropUnmapped?: boolean;
}): Promise<Array<{
    name: string;
    condition: Condition;
    clustering: ClusterLogsResponse;
}>>;

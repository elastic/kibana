import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { StreamsStatsTelemetry } from './types';
/**
 * Registers the Streams usage statistics collector with Kibana's usage collection service
 * This is reported under stack_stats as snapshot telemetry and collected once daily
 */
export declare function registerStreamsUsageCollector(usageCollection: UsageCollectionSetup, collectorOptions: {
    isReady: () => boolean;
    fetch: (context: {
        esClient: ElasticsearchClient;
    }) => Promise<StreamsStatsTelemetry>;
}): void;

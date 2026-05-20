import type { Streams } from '@kbn/streams-schema';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { Logger } from '@kbn/core/server';
export interface StreamsUsageReader {
    readAllManagedStreams(): Promise<Streams.all.Definition[]>;
}
/**
 * Registers the Streams usage statistics collector
 */
export declare function registerStreamsUsageCollector(usageCollection: UsageCollectionSetup, logger: Logger, getReader: () => Promise<StreamsUsageReader>): void;

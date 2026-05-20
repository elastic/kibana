import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { TaggingUsageData } from './types';
export declare const createTagUsageCollector: ({ usageCollection, getKibanaIndices, }: {
    usageCollection: UsageCollectionSetup;
    getKibanaIndices: () => Promise<string[]>;
}) => import("@kbn/usage-collection-plugin/server").Collector<TaggingUsageData, {}>;

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
export declare function registerUsageCollector(usageCollection: UsageCollectionSetup | undefined, core: CoreSetup): void;

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { PluginsSetup } from '../plugin';
import type { UsageStats, UsageStatsServiceSetup } from '../usage_stats';
export interface UsageData extends UsageStats {
    available: boolean;
    enabled: boolean;
    count?: number;
    usesFeatureControls?: boolean;
    solutions: Record<string, number>;
    disabledFeatures: {
        [key: string]: number | undefined;
        stackAlerts?: number;
        actions?: number;
        enterpriseSearch?: number;
        fleet?: number;
        savedObjectsTagging?: number;
        indexPatterns?: number;
        discover?: number;
        canvas?: number;
        maps?: number;
        siem?: number;
        monitoring?: number;
        graph?: number;
        uptime?: number;
        savedObjectsManagement?: number;
        dev_tools?: number;
        advancedSettings?: number;
        infrastructure?: number;
        visualize?: number;
        logs?: number;
        dashboard?: number;
        ml?: number;
        apm?: number;
    };
}
interface CollectorDeps {
    getIndexForType: (type: string) => Promise<string>;
    features: PluginsSetup['features'];
    licensing: PluginsSetup['licensing'];
    usageStatsServicePromise: Promise<UsageStatsServiceSetup>;
}
export declare function getSpacesUsageCollector(usageCollection: UsageCollectionSetup, deps: CollectorDeps): import("@kbn/usage-collection-plugin/server").Collector<UsageData, {}>;
export declare function registerSpacesUsageCollector(usageCollection: UsageCollectionSetup, deps: CollectorDeps): void;
export {};

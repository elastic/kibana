import type { MonitoringCollectionSetup } from '@kbn/monitoring-collection-plugin/server';
import type { InMemoryMetrics } from '.';
export declare function registerNodeCollector({ monitoringCollection, inMemoryMetrics, }: {
    monitoringCollection: MonitoringCollectionSetup;
    inMemoryMetrics: InMemoryMetrics;
}): void;

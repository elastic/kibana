import type { UiCounterMetricType } from '@kbn/analytics';
import { METRIC_TYPE } from '@kbn/analytics';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
export { METRIC_TYPE };
export declare let usageCollection: UsageCollectionSetup | undefined;
export declare function init(_usageCollection: UsageCollectionSetup): void;
export declare function trackUiMetric(metricType: UiCounterMetricType, name: string): void;
/**
 * Transparently return provided request Promise, while allowing us to track
 * a successful completion of the request.
 */
export declare function trackUserRequest<T>(request: Promise<T>, eventName: string): Promise<T>;

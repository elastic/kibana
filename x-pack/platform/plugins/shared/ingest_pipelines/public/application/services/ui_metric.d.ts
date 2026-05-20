import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
export declare class UiMetricService {
    private usageCollection;
    setup(usageCollection: UsageCollectionSetup): void;
    private track;
    trackUiMetric(eventName: string): void;
}
export declare const uiMetricService: UiMetricService;

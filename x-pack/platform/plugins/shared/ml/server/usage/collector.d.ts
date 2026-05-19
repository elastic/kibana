import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { type MlCustomRulesUsage } from './custom_rules_usage_aggregation';
import { type MlCalendarsUsage, type MlGetCalendarsCalendarItem } from './calendars_usage_aggregation';
import { type MlFilterListsUsage } from './filter_lists_usage_aggregation';
export type { MlCustomRulesUsage, MlCalendarsUsage, MlGetCalendarsCalendarItem, MlFilterListsUsage, };
export interface MlUsageData {
    alertRules: {
        'xpack.ml.anomaly_detection_alert': {
            count_by_result_type: {
                record: number;
                bucket: number;
                influencer: number;
            };
            count_with_kql_filter: {
                record: number;
                influencer: number;
            };
        };
        'xpack.ml.anomaly_detection_jobs_health': {
            count_by_check_type: {
                datafeed: number;
                mml: number;
                delayedData: number;
                errorMessages: number;
            };
        };
    };
    custom_rules: MlCustomRulesUsage;
    calendars: MlCalendarsUsage;
    filter_lists: MlFilterListsUsage;
}
export declare function registerCollector(usageCollection: UsageCollectionSetup, getIndexForType: (type: string) => Promise<string>): void;

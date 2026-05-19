import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { JobsHealthRuleTestsConfig } from '@kbn/ml-common-types/alerts';
/**
 * Resolves the lookback interval for the rule
 * using the formula max(2m, 2 * bucket_span) + query_delay + 1s.
 * and rounds up to a whole number of minutes.
 */
export declare function resolveLookbackInterval(jobs: Job[], datafeeds: Datafeed[]): string;
/**
 * @deprecated We should avoid using {@link CombinedJobWithStats}. Replace usages with {@link resolveLookbackInterval} when
 * Kibana API returns mapped job and the datafeed configs.
 */
export declare function getLookbackInterval(jobs: CombinedJobWithStats[]): string;
export declare function getTopNBuckets(job: Job): number;
/**
 * Returns tests configuration combined with default values.
 * @param config
 */
export declare function getResultJobsHealthRuleConfig(config: JobsHealthRuleTestsConfig): Pick<{
    datafeed: {
        enabled: boolean;
    };
    mml: {
        enabled: boolean;
    };
    delayedData: {
        enabled: boolean;
        docsCount: number;
        timeInterval: string | null;
    };
    behindRealtime: {
        enabled: boolean;
    };
    errorMessages: {
        enabled: boolean;
    };
}, "datafeed" | "mml" | "delayedData" | "behindRealtime" | "errorMessages">;

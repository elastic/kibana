import type { Duration } from 'moment';
import type { estypes } from '@elastic/elasticsearch';
import type { Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { type MlEntityField, ES_AGGREGATION, ML_JOB_AGGREGATION } from '@kbn/ml-anomaly-utils';
import type { Job, JobId, CustomSettings } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { CombinedJob, CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { MlServerLimits } from '@kbn/ml-common-types/ml_server_info';
import type { JobValidationMessage, JobValidationMessageId } from '../constants/messages';
export interface ValidationResults {
    valid: boolean;
    messages: JobValidationMessage[];
    contains: (id: JobValidationMessageId) => boolean;
    find: (id: JobValidationMessageId) => {
        id: JobValidationMessageId;
    } | undefined;
}
export declare function calculateDatafeedFrequencyDefaultSeconds(bucketSpanSeconds: number): number;
export declare function isTimeSeriesViewJob(job: CombinedJob): boolean;
export declare function isTimeSeriesViewDetector(job: CombinedJob, detectorIndex: number): boolean;
export declare function isMappableJob(job: CombinedJob, detectorIndex: number): boolean;
export declare function isJobWithGeoData(job: Job): boolean;
/**
 * Validates that composite definition only have sources that are only terms and date_histogram
 * if composite is defined.
 * @param buckets
 */
export declare function hasValidComposite(buckets: estypes.AggregationsAggregationContainer): boolean;
/**
 * Validates if aggregation type is currently not supported
 * e.g. any other type other than 'date_histogram' or 'aggregations'
 * @param buckets
 */
export declare function isUnsupportedAggType(aggType: string): boolean;
export declare function isSourceDataChartableForDetector(job: CombinedJob, detectorIndex: number): boolean;
export declare function isModelPlotChartableForDetector(job: Job, detectorIndex: number): boolean;
export declare function getSingleMetricViewerJobErrorMessage(job: CombinedJob): string | undefined;
export declare function getPartitioningFieldNames(job: CombinedJob, detectorIndex: number): string[];
export declare function isModelPlotEnabled(job: Job, detectorIndex: number, entityFields?: MlEntityField[]): boolean;
export declare function isJobVersionGte(job: CombinedJob, version: string): boolean;
export declare function mlFunctionToESAggregation(functionName?: ML_JOB_AGGREGATION | string): ES_AGGREGATION | null;
export declare function isJobIdValid(jobId: JobId): boolean;
export declare const ML_MEDIAN_PERCENTS = "50.0";
export declare const ML_DATA_PREVIEW_COUNT = 10;
export declare function prefixDatafeedId(datafeedId: string, prefix: string): string;
export declare function createDatafeedId(jobId: string): string;
export declare function uniqWithIsEqual<T extends any[]>(arr: T): T;
export declare function basicJobValidation(job: Job, fields: object | undefined, limits: MlServerLimits, skipMmlChecks?: boolean): ValidationResults;
export declare function basicDatafeedValidation(datafeed: Datafeed): ValidationResults;
export declare function basicJobAndDatafeedValidation(job: Job, datafeed: Datafeed): ValidationResults;
export declare function validateModelMemoryLimit(job: Job, limits: MlServerLimits): ValidationResults;
export declare function validateModelMemoryLimitUnits(modelMemoryLimit: string | undefined): ValidationResults;
export declare function validateGroupNames(job: Job): ValidationResults;
/**
 * Parses the supplied string to a time interval suitable for use in an ML anomaly
 * detection job or datafeed.
 * @param value the string to parse
 * @return {Duration} the parsed interval, or null if it does not represent a valid
 * time interval.
 */
export declare function parseTimeIntervalForJob(value: string | number | undefined): Duration | null;
export declare function getEarliestDatafeedStartTime(latestRecordTimestamp: number | undefined, latestBucketTimestamp: number | undefined, bucketSpan?: Duration | null | undefined): number | undefined;
export declare function getLatestDataOrBucketTimestamp(latestDataTimestamp: number | undefined, latestBucketTimestamp: number | undefined): number | undefined;
/**
 * If created_by is set in the job's custom_settings, remove it in case
 * it was created by a job wizard as the rules cannot currently be edited
 * in the job wizards and so would be lost in a clone.
 */
export declare function processCreatedBy(customSettings: CustomSettings): void;
export declare function splitIndexPatternNames(indexPatternName: string): string[];
/**
 * Resolves the longest time interval from the list.
 * @param timeIntervals Collection of the strings representing time intervals, e.g. ['15m', '1h', '2d']
 */
export declare function resolveMaxTimeInterval(timeIntervals: estypes.Duration[]): number | undefined;
export declare function getFiltersForDSLQuery(datafeedQuery: estypes.QueryDslQueryContainer, dataViewId: string | undefined, alias?: string, store?: FilterStateStore): Filter[];
export declare function isKnownEmptyQuery(query: estypes.QueryDslQueryContainer): boolean;
/**
 * Extract unique influencers from the job or collection of jobs
 * @param jobs
 */
export declare function extractInfluencers(jobs: Job | Job[]): string[];
export declare function removeNodeInfo(job: CombinedJobWithStats): CombinedJobWithStats;

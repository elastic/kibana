import type { DataView } from '@kbn/data-views-plugin/public';
import { type DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
export declare function getDropDownOptions(isFirstRender: boolean, job: Job | DataFrameAnalyticsConfig, dataView?: DataView, isPartialDFAJob?: boolean): string[];

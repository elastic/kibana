import type { ES_AGGREGATION } from '@kbn/ml-anomaly-utils';
import type { SeriesConfig } from '@kbn/ml-common-types/results';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
/**
 * Builds the basic configuration to plot a chart of the source data
 * analyzed by the the detector at the given index from the specified ML job.
 * @param job Job config info
 * @param detectorIndex The index of the detector in the job config
 * @param metricFunctionDescription The underlying function (min, max, avg) for "metric" detector type
 * @returns
 */
export declare function buildConfigFromDetector(job: Job, detectorIndex: number, metricFunctionDescription?: ES_AGGREGATION): SeriesConfig;

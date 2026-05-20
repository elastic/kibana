import type { FC } from 'react';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
interface Props {
    jobs: MlSummaryJob[];
}
export declare const OpenJobsWarningCallout: FC<Props>;
export {};

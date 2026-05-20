import type { FC } from 'react';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
type ShowFunc = (jobs: MlSummaryJob[]) => void;
interface Props {
    setShowFunction(showFunc: ShowFunc): void;
    unsetShowFunction(): void;
    refreshJobs(): void;
    showStopDatafeedsFlyout(job: MlSummaryJob[]): void;
}
export declare const StopDatafeedsConfirmModal: FC<Props>;
export {};

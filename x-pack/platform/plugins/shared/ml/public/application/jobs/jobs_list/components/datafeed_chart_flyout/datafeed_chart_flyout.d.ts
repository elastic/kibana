import type { FC } from 'react';
import type { ModelSnapshot } from '@kbn/ml-common-types/anomaly_detection_jobs/model_snapshot';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { FocusTrapProps } from '../../../../util/create_focus_trap_props';
interface DatafeedChartFlyoutProps {
    jobId: string;
    end: number;
    onClose: () => void;
    onModelSnapshotAnnotationClick?: (modelSnapshot: ModelSnapshot) => void;
    focusTrapProps?: FocusTrapProps;
}
export declare const DatafeedChartFlyout: FC<DatafeedChartFlyoutProps>;
type ShowFunc = (jobUpdate: MlSummaryJob) => void;
interface JobListDatafeedChartFlyoutProps {
    setShowFunction: (showFunc: ShowFunc) => void;
    unsetShowFunction: () => void;
    refreshJobs(): void;
}
/**
 * Component to wire the datafeed chart flyout with the Job list view.
 * @param setShowFunction function to show the flyout
 * @param unsetShowFunction function called when flyout is closed
 * @param refreshJobs function to refresh the jobs list
 * @constructor
 */
export declare const JobListDatafeedChartFlyout: FC<JobListDatafeedChartFlyoutProps>;
export {};

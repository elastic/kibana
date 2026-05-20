import type { FC } from 'react';
import type { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { ExplorerJob } from '../../explorer/explorer_utils';
interface Props {
    viewId: typeof ML_PAGES.SINGLE_METRIC_VIEWER | typeof ML_PAGES.ANOMALY_EXPLORER;
    selectedJobs?: ExplorerJob[] | MlSummaryJob[] | null;
}
/**
 * Component for rendering a set of buttons for switching between the Anomaly Detection results views.
 */
export declare const AnomalyResultsViewSelector: FC<Props>;
export {};

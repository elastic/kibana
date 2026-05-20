import type { FC } from 'react';
import { type MlPages } from '@kbn/ml-common-types/locator_ml_pages';
interface Props {
    jobId: string;
    page: MlPages;
    onRemoveJobId: (jobOrGroupId: string[]) => void;
    removeJobIdDisabled: boolean;
    isSingleMetricViewerDisabled: boolean;
}
export declare const AnomalyDetectionInfoButton: FC<Props>;
export {};

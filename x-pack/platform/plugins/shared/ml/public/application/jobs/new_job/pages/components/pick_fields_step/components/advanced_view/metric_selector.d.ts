import type { FC } from 'react';
import type { Aggregation, Field } from '@kbn/ml-anomaly-utils';
import type { ModalPayload } from '../advanced_detector_modal';
import type { RichDetector } from '../../../../../common/job_creator/advanced_job_creator';
interface Props {
    payload: ModalPayload | null;
    fields: Field[];
    aggs: Aggregation[];
    detectorChangeHandler: (dtr: RichDetector) => void;
    closeModal(): void;
    showModal(): void;
}
export declare const MetricSelector: FC<Props>;
export {};

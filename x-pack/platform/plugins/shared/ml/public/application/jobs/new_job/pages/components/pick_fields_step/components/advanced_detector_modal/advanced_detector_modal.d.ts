import type { FC } from 'react';
import { type Field, type Aggregation } from '@kbn/ml-anomaly-utils';
import type { RichDetector } from '../../../../../common/job_creator/advanced_job_creator';
interface Props {
    payload: ModalPayload;
    fields: Field[];
    aggs: Aggregation[];
    detectorChangeHandler: (dtr: RichDetector, index?: number) => void;
    closeModal(): void;
}
export interface ModalPayload {
    detector: RichDetector;
    index?: number;
}
export declare const AdvancedDetectorModal: FC<Props>;
export {};

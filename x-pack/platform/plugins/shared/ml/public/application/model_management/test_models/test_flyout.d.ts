import type { FC } from 'react';
import type { TrainedModelItem } from '@kbn/ml-common-types/trained_models';
interface Props {
    model: TrainedModelItem;
    onClose: () => void;
}
export declare const TestTrainedModelFlyout: FC<Props>;
export {};

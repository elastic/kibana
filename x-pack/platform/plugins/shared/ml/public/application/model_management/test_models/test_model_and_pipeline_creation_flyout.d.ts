import type { FC } from 'react';
import type { TrainedModelItem } from '@kbn/ml-common-types/trained_models';
interface Props {
    model: TrainedModelItem;
    onClose: (refreshList?: boolean) => void;
}
export declare const TestModelAndPipelineCreationFlyout: FC<Props>;
export {};

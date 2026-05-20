import type { FC } from 'react';
import type { TrainedModelItem } from '@kbn/ml-common-types/trained_models';
export interface CreatePipelineForModelFlyoutProps {
    onClose: (refreshList?: boolean) => void;
    model: TrainedModelItem;
}
export declare const CreatePipelineForModelFlyout: FC<CreatePipelineForModelFlyoutProps>;

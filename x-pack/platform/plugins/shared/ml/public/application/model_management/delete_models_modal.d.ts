import type { FC } from 'react';
import type { TrainedModelUIItem } from '@kbn/ml-common-types/trained_models';
interface DeleteModelsModalProps {
    models: TrainedModelUIItem[];
    onClose: () => void;
    onDelete: (refreshList?: boolean) => void;
}
export declare const DeleteModelsModal: FC<DeleteModelsModalProps>;
export {};
